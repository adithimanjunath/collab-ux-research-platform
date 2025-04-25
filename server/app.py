from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId

app = Flask(__name__)

# Allow any origin (for dev purposes)
CORS(app, origins=["http://localhost:3000"])

# MongoDB setup
client = MongoClient("mongodb://mongodb:27017/")
db = client.ux_research
notes_collection = db.notes

# @app.after_request
# def add_cors_headers(response):
#     response.headers.add("Access-Control-Allow-Origin", "*")
#     response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
#     response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
#     return response

@app.route("/")
def home():
    return jsonify({"message": "Hello from Flask backend!"})

@app.route("/api/notes", methods=["POST", "OPTIONS"])
def create_note():
    if request.method == "OPTIONS":
        return '', 204

    data = request.json
    note = {
        "id": data.get("id"),
        "text": data.get("text"),
        "x": data.get("x", 100),
        "y": data.get("y", 100),
    }
    result = notes_collection.insert_one(note)
    note["_id"] = str(result.inserted_id)
    
    return jsonify({"status": "success", "note": note})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)

