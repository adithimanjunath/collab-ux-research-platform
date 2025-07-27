from flask_socketio import emit, join_room
from services.note_service import create_note, update_note, delete_note
from db import notes_collection

online_users = {}

def register_socket_events(socketio):
    @socketio.on("create_note")
    def handle_create_note(data):
        create_note(data)
        data.pop("_id", None)
        emit("new_note", data, room=data["boardId"], include_self=True)

    @socketio.on("edit_note")
    def handle_edit_note(data):
        update_note(data["id"], {
            "text": data["text"],
            "x": data["x"],
            "y": data["y"],
            "user": data["user"]
        })
        emit("note_edited", data, room=data["boardId"])

    @socketio.on("move_note")
    def handle_move_note(data):
        update_note(data["id"], {"x": data["x"], "y": data["y"]})
        emit("note_moved", data, room=data["boardId"])

    @socketio.on("delete_note")
    def handle_delete_note(data):
        delete_note(data["id"])
        emit("note_deleted", {"id": data["id"]}, room=data["boardId"])

    @socketio.on("join_board")
    def handle_join_board(data):
        board_id, username = data.get("boardId"), data.get("username")
        join_room(board_id)
        online_users.setdefault(board_id, set()).add(username)
        emit("user_list", list(online_users[board_id]), room=board_id)
        emit("user_joined", f"{username} joined the board.", room=board_id)

    @socketio.on("leave_board")
    def handle_leave_board(data):
        board_id, username = data.get("boardId"), data.get("username")
        if board_id in online_users:
            online_users[board_id].discard(username)
            emit("user_list", list(online_users[board_id]), room=board_id)