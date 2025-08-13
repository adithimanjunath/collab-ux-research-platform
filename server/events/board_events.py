from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from firebase_admin import auth as fb_auth
from services.note_service import create_note, update_note, delete_note
from auth.firebase_verify import verify_firebase_token

socketio = SocketIO(cors_allowed_origins="*")

# Optional: socket presence (can be removed if only Firestore presence is used)
online_users = {}

def _broadcast_user_list(board_id):
    users = online_users.get(board_id, {})
    emit(
        "user_list",
        {
            "boardId": board_id,
            "users": [
                {"uid": uid, "name": u["name"], "email": u["email"]}
                for uid, u in users.items()
            ],
        },
        room=board_id
    )

# -------------------------
# Join/Leave Board
# -------------------------
def register_socket_events(socketio):
    @socketio.on("join_board")
    def join_board(data):
        token = data.get("token")
        board_id = data.get("boardId")
        decoded = fb_auth.verify_id_token(token)
        uid = decoded["uid"]
        name = decoded.get("name") or decoded.get("displayName") or "User"
        email = decoded.get("email")
        sid = request.sid

        join_room(board_id)
        print(f"✅ User {name} ({uid}) joined room {board_id} with socket {sid}")

        # Optional socket-based presence (ignored if using Firestore presence)
        board_users = online_users.setdefault(board_id, {})
        user_entry = board_users.setdefault(uid, {"name": name, "email": email, "sockets": set()})
        user_entry["name"] = name
        user_entry["email"] = email
        user_entry["sockets"].add(sid)
        _broadcast_user_list(board_id)

    @socketio.on("leave_board")
    def leave_board(data):
        board_id = data.get("boardId")
        sid = request.sid
        leave_room(board_id)
        if board_id in online_users:
            for uid in list(online_users[board_id].keys()):
                online_users[board_id][uid]["sockets"].discard(sid)
                if not online_users[board_id][uid]["sockets"]:
                    del online_users[board_id][uid]
            _broadcast_user_list(board_id)
        print(f"🚪 Socket {sid} left board {board_id}")

    @socketio.on("disconnect")
    def disconnect():
        sid = request.sid
        print(f"🔌 Socket {sid} disconnected")
        for board_id in list(online_users.keys()):
            for uid in list(online_users[board_id].keys()):
                online_users[board_id][uid]["sockets"].discard(sid)
                if not online_users[board_id][uid]["sockets"]:
                    del online_users[board_id][uid]
            _broadcast_user_list(board_id)

    # -------------------------
    # Note Events
    # -------------------------
    @socketio.on("create_note")
    def handle_create_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        create_note(data)
        data.pop("_id", None)
        print(f"📝 Broadcasting new note to room {data['boardId']}")
        emit("new_note", data, room=data["boardId"], include_self=False)

    @socketio.on("edit_note")
    def handle_edit_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        update_note(data["id"], {
            "text": data["text"],
            "x": data["x"],
            "y": data["y"],
            "user": data["user"]
        })
        print(f"✏️ Broadcasting edited note {data['id']} to room {data['boardId']}")
        emit("note_edited", data, room=data["boardId"], include_self=False)

    @socketio.on("move_note")
    def handle_move_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        update_note(data["id"], {"x": data["x"], "y": data["y"]})
        print(f"📍 Broadcasting moved note {data['id']} to room {data['boardId']}")
        emit("note_moved", data, room=data["boardId"], include_self=False)

    @socketio.on("delete_note")
    def handle_delete_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        delete_note(data["id"])
        print(f"🗑 Broadcasting deleted note {data['id']} to room {data['boardId']}")
        emit("note_deleted", {"id": data["id"]}, room=data["boardId"], include_self=False)
