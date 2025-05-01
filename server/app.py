import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from pymongo import MongoClient
from bson import ObjectId


app = Flask(__name__)

# Allow any origin (for dev purposes)
CORS(app, origins=["http://localhost:3000"])
socketio = SocketIO(app, cors_allowed_origins="*")

# MongoDB setup
client = MongoClient("mongodb://mongodb:27017/")
db = client.ux_research
notes_collection = db.notes

@app.route("/")
def home():
    return jsonify({"message": "Hello from Flask backend!"})

# Handle new notes from any client
@socketio.on("create_note")
def handle_create_note(data):
    print("Received note:", data)
    # Save to DB
    result=notes_collection.insert_one(data)
    # Broadcast to all other clients
    data["_id"]=str(result.inserted_id)
    emit("new_note", data, broadcast=True)

# @app.route("/api/notes", methods=["POST", "OPTIONS"])
# def create_note():
#     if request.method == "OPTIONS":
#         return '', 204

#     data = request.json
#     note = {
#         "id": data.get("id"),
#         "text": data.get("text"),
#         "x": data.get("x", 100),
#         "y": data.get("y", 100),
#     }
#     result = notes_collection.insert_one(note)
#     note["_id"] = str(result.inserted_id)
    
 #   return jsonify({"status": "success", "note": note})


if __name__ == "__main__":
    socketio.run(app,host="0.0.0.0", port=5050, debug=True)

