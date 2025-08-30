from flask import Blueprint, request, jsonify, current_app
import os

try:
    from firebase_admin import auth as firebase_auth
except Exception:
    firebase_auth = None

test_bp = Blueprint("test_bp", __name__)


@test_bp.post("/api/test/login")
def test_login():
    secret_cfg = os.getenv("TEST_LOGIN_SECRET")
    if not secret_cfg:
        return jsonify({"error": "disabled"}), 404
    if request.headers.get("X-Test-Secret") != secret_cfg:
        return jsonify({"error": "forbidden"}), 403
    if firebase_auth is None:
        return jsonify({"error": "firebase_missing"}), 500

    body = request.get_json(silent=True) or {}
    uid = body.get("uid") or "cypress-user"
    # Optional additional claims could be added here if your app uses them
    try:
        token_bytes = firebase_auth.create_custom_token(uid)
        token = token_bytes.decode("utf-8") if isinstance(token_bytes, (bytes, bytearray)) else str(token_bytes)
        return jsonify({"customToken": token})
    except Exception as e:
        current_app.logger.exception("Failed to create custom token")
        return jsonify({"error": "token_error", "message": str(e)}), 500
