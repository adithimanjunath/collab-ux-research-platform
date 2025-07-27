from flask import Blueprint, request, jsonify
from services.note_service import get_notes_by_board
from db import notes_collection;

note_bp = Blueprint("note_bp", __name__)

@note_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Hello from Flask backend!"})

@note_bp.route("/api/notes", methods=["GET"])
def get_notes():
    board_id = request.args.get("boardId")
    if not board_id:
        print("❌ boardId is missing")
        return jsonify([])
        return jsonify(get_notes_by_board(board_id))

    try:
        print(f"📥 Fetching notes for boardId: {board_id}")
        notes = list(notes_collection.find({"boardId": board_id}))
        for note in notes:
            note["_id"] = str(note["_id"])
        return jsonify(notes)
    except Exception as e:
        print(f"❌ Failed to fetch notes for {board_id}:", e)
        return jsonify({"error": "Internal server error"}), 500
