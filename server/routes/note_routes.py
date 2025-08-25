from flask import Blueprint, request, jsonify,g,current_app
from services.note_service import get_notes_by_board
from db import notes_collection
from auth.auth_decorator import authenticate_request
from pymongo import MongoClient


note_bp = Blueprint("note_bp", __name__)

@note_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Hello from Flask backend!"})

@note_bp.route("/api/notes", methods=["GET"])
@authenticate_request
def get_notes():
    board_id = request.args.get("boardId")
    if not board_id:
        return jsonify({"error": "boardId required"}), 400
    
    user_email = g.user.get("email")
    current_app.logger.debug("User email: %s", user_email)

    try:
        return jsonify(get_notes_by_board(board_id)), 200
    except Exception as e:
        current_app.logger.exception("Failed to fetch notes: %s", e)
        return jsonify({"error": "Failed to fetch notes"}), 500

    
@note_bp.route("/api/notes/cleanup", methods=["POST"])
@authenticate_request
def cleanup_notes_without_boardId():
    try:
        result = notes_collection.delete_many({"boardId": {"$exists": False}})
        return jsonify({
            "message": f"✅ Deleted {result.deleted_count} notes without boardId."
            }), 200
    except Exception as e:
        current_app.logger.exception("Cleanup failed: %s", e)
        return jsonify({"error": "Failed to delete notes"}), 500



@note_bp.route("/api/logged_users", methods=["GET"])
@authenticate_request
def get_logged_users():
    db = notes_collection.database
    # Return list of unique users tracked in database
    users = db.users.find({}, {"_id": 0, "uid": 1, "name": 1, "email": 1})
    return jsonify(list(users)), 200