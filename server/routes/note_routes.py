from flask import Blueprint, request, jsonify
from services.note_service import get_notes_by_board

note_bp = Blueprint("note_bp", __name__)

@note_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Hello from Flask backend!"})

@note_bp.route("/api/notes", methods=["GET"])
def get_notes():
    board_id = request.args.get("boardId")
    if not board_id:
        return jsonify([])
    return jsonify(get_notes_by_board(board_id))
