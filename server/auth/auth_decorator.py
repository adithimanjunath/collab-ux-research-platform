# auth_decorator.py
from functools import wraps
from flask import request, jsonify
from firebase_admin import auth as firebase_auth

def authenticate_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "")

        if not token:
            return jsonify({"error": "No token provided"}), 401

        try:
            decoded_token = firebase_auth.verify_id_token(token)
            request.user = decoded_token
        except Exception as e:
            return jsonify({"error": "Invalid token", "details": str(e)}), 401

        return f(*args, **kwargs)
    

    return decorated_function
