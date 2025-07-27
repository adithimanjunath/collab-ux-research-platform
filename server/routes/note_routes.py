from flask import Blueprint, request, jsonify
from db import notes_collection;
import logging

logger = logging.getLogger(__name__)
note_bp = Blueprint("note_bp", __name__)

@note_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Hello from Flask backend!"})

@note_bp.route("/api/notes", methods=["GET"])
def get_notes():
    board_id = request.args.get("boardId")
    if not board_id:
        logger.warning("❌ boardId is missing in request")
        return jsonify({"error": "Missing boardId"}), 400

    try:
        logger.info(f"📥 Fetching notes for boardId: {board_id}")
        notes = list(notes_collection.find({"boardId": board_id}))

        for note in notes:
            note["_id"] = str(note["_id"])

            logger.info(f"✅ Found {len(notes)} notes for board '{board_id}'")
            return jsonify(notes)
        
    except Exception as e:
        logger.error(f"❌ Error fetching notes for '{board_id}': {e}")
        return jsonify({"error": "Internal server error"}), 500
