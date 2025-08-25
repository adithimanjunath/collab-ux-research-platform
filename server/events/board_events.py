from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from firebase_admin import auth as fb_auth
from services.note_service import create_note, update_note, delete_note, get_notes_by_board
from auth.firebase_verify import verify_firebase_token

# Optional: socket presence (can be removed if only Firestore presence is used)
online_users = {}
sid_to_uid = {}
latest_sid_by_uid = {}              # { uid: sid }

def _broadcast_user_list(board_id):
    users = online_users.get(board_id, {})
    payload = {
        "boardId": board_id,
        "users": [
            {"uid": uid, "name": u["name"], "email": u["email"]}
            for uid, u in users.items()
        ],
    }
    emit("user_list", payload, room=board_id)
    emit("online_users", payload["users"], room=board_id)


# -------------------------
# Join/Leave Board
# -------------------------
def register_socket_events(socketio):
    @socketio.on("join_board")
    def join_board(data):
        token = data.get("token")
        board_id = data.get("boardId")
        if not board_id:
            emit("join_denied", {"reason": "Missing boardId"})
            return
        try:
            decoded = fb_auth.verify_id_token(token)
        except Exception:
            decoded = None
        if not decoded:
            emit("join_denied", {"reason": "Invalid or missing token"})
            return

        # Count users who were already on this board before we add the new joiner
        pre_count = len(online_users.get(board_id, {}))

        uid   = decoded["uid"]
        name  = decoded.get("name") or decoded.get("displayName") or "User"
        email = decoded.get("email") or ""
        sid   = request.sid
        latest_sid_by_uid[uid] = sid

        join_room(board_id)
        sid_to_uid[sid] = uid

        board_users = online_users.setdefault(board_id, {})
        user_entry = board_users.setdefault(uid, {"name": name, "email": email, "sockets": set()})
        user_entry["sockets"].add(sid)

        print(f"✅ Auto join: {name} ({uid}) AUTO joined room {board_id} ")
        emit("join_granted", {"boardId": board_id}, room=sid)
        # Send full note snapshot to the newly joined client so everyone sees the same board
        try:
            notes = get_notes_by_board(board_id)
        except Exception:
            notes = []
        emit("load_existing_notes", {"boardId": board_id, "notes": notes}, room=sid)

        # Demo-only: if there are already users on this board, ask the new joiner to show a brief waiting overlay
        if pre_count > 0:
            print(f"🕒 demo_wait -> only SID {sid} (others online: {pre_count})")
            emit("demo_wait", {"ms": 3500}, room=sid)

        emit("user_joined", {"uid": uid, "name": name, "email": email}, room=board_id, include_self=False)
        _broadcast_user_list(board_id)

    @socketio.on("get_online_users")
    def get_online_users(data):
        board_id = data.get("boardId")
        users = online_users.get(board_id, {})
        emit("online_users", [
            {"uid": uid, "name": u["name"], "email": u["email"]}
            for uid, u in users.items()
        ])
        emit("user_list", {
            "boardId": board_id,
            "users": [
                {"uid": uid, "name": u["name"], "email": u["email"]}
                for uid, u in users.items()
            ],
        })


    @socketio.on("leave_board")
    def leave_board(data):
        board_id = data.get("boardId")
        sid = request.sid
        leave_room(board_id)
        left_uid = sid_to_uid.get(sid)
        sid_to_uid.pop(sid, None)

        if board_id in online_users:
            for uid in list(online_users[board_id].keys()):
                online_users[board_id][uid]["sockets"].discard(sid)
                if not online_users[board_id][uid]["sockets"]:
                    del online_users[board_id][uid]
            if left_uid:
                emit("user_left", {"uid": left_uid}, room=board_id, include_self=False)
            _broadcast_user_list(board_id)
        print(f"🚪 Socket {sid} left board {board_id}")

    @socketio.on("disconnect")
    def disconnect(*args):
        sid = request.sid
        uid = sid_to_uid.pop(sid, None)
        print(f"🔌 Socket {sid} disconnected")
        # remove from online_users
        for board_id in list(online_users.keys()):
            removed = []
            for u in list(online_users[board_id].keys()):
                online_users[board_id][u]["sockets"].discard(sid)
                if not online_users[board_id][u]["sockets"]:
                    del online_users[board_id][u]
                    removed.append(u)
            for u in removed:
                emit("user_left", {"uid": u}, room=board_id, include_self=False)
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
        emit("new_note", data, room=data["boardId"])

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
        emit("note_edited", data, room=data["boardId"])

    @socketio.on("move_note")
    def handle_move_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        update_note(data["id"], {"x": data["x"], "y": data["y"]})
        print(f"📍 Broadcasting moved note {data['id']} to room {data['boardId']}")
        emit("note_moved", data, room=data["boardId"])

    @socketio.on("delete_note")
    def handle_delete_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        delete_note(data["id"])
        print(f"🗑 Broadcasting deleted note {data['id']} to room {data['boardId']}")
        emit("note_deleted", {"id": data["id"]}, room=data["boardId"])