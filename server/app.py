import eventlet # type: ignore
eventlet.monkey_patch()
import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room# type: ignore
from pymongo import MongoClient
from bson import ObjectId


app = Flask(__name__)

# Allow any origin (for dev purposes)
CORS(app, origins=["http://localhost:3000", "https://your-frontend.vercel.app"])
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=60,       # seconds before disconnect
    ping_interval=25,      # interval between pings
    logger=True,
    engineio_logger=True
)



# MongoDB setup
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client.ux_research
notes_collection = db.notes
online_users = {}

@app.route("/")
def home():
    return jsonify({"message": "Hello from Flask backend!"})

@app.route("/api/notes", methods=["GET"])
def get_notes():
    board_id = request.args.get("boardId")
    if not board_id:
        return jsonify([])

    notes = list(notes_collection.find({"boardId": board_id}, {"_id": 0}))
    return jsonify(notes)


@socketio.on("create_note")
def handle_create_note(data):
    board_id = data.get("boardId")
    if not board_id:
        return

    notes_collection.insert_one(data)
    safe_data = data.copy()
    safe_data.pop("_id", None)
    emit("new_note", safe_data, room=board_id,include_self=True)

@socketio.on("join_board")
def handle_join_board(data):
    board_id = data.get("boardId")
    username = data.get("username")

    if board_id and username:
        join_room(board_id)
        if board_id not in online_users:
            online_users[board_id] = set()
        online_users[board_id].add(username)

        # Send updated user list
        emit("user_list", list(online_users[board_id]), room=board_id)

        # 👇 Emit a join message
        emit("user_joined", f"{username} joined the board.", room=board_id)


@socketio.on("edit_note")
def handle_edit_note(data):
    board_id = data.get("boardId")
    note_id = data.get("id")
    updated_fields = {
        "text": data.get("text"),
        "x": data.get("x"),
        "y": data.get("y"),
        "user": data.get("user")
    }
    notes_collection.update_one({"id": note_id}, {"$set": updated_fields})
    emit("note_edited", data, room=board_id)


@socketio.on("move_note")
def handle_move_note(data):
    board_id = data.get("boardId")
    note_id = data.get("id")
    x, y = data.get("x"), data.get("y")
    notes_collection.update_one({"id": note_id}, {"$set": {"x": x, "y": y}})
    emit("note_moved", data, room=board_id)


@socketio.on("delete_note")
def handle_delete_note(data):
    board_id = data.get("boardId")
    note_id = data.get("id")
    notes_collection.delete_one({"id": note_id})
    emit("note_deleted", {"id": note_id}, room=board_id)

@socketio.on("leave_board")
def handle_leave_board(data):
    board_id = data.get("boardId")
    username = data.get("username")

    if board_id and username:
        if board_id in online_users:
            online_users[board_id].discard(username)
            emit("user_list", list(online_users[board_id]), room=board_id)



if __name__ == "__main__":
    socketio.run(app,host="0.0.0.0", port=5050, debug=True)

