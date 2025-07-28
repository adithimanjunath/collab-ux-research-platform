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
        return jsonify({"error": "Missing boardId"}), 400

    try:
        notes = get_notes_by_board(board_id)
        return jsonify(notes)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500
    
@note_bp.route("/api/notes/cleanup", methods=["POST"])
def cleanup_notes_without_boardId():
    try:
        result = notes_collection.delete_many({"boardId": {"$exists": False}})
        return jsonify({
            "message": f"✅ Deleted {result.deleted_count} notes without boardId."
            }), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete notes"}), 500
