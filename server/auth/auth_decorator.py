# auth_decorator.py
from functools import wraps
from flask import g, request, jsonify
from firebase_admin import auth as firebase_auth
from  auth.firebase_verify import verify_firebase_token

# def authenticate_request(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         auth_header = request.headers.get("Authorization", "")
#         token = auth_header.replace("Bearer ", "")

#         if not token:
#             print("❌ No token provided in request headers.")
#             return jsonify({"error": "No token provided"}), 401

#         try:
#             token = token.replace("Bearer ", "")
#             decoded_token = firebase_auth.verify_id_token(token)
#             request.user = decoded_token
#         except Exception as e:
#             return jsonify({"error": "Invalid token", "details": str(e)}), 401

#         return f(*args, **kwargs)
    

#     return decorated_function
def authenticate_request(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            print("❌ Missing Authorization header")
            return jsonify({"error": "Missing token"}), 401
        try:
            token = token.replace("Bearer ", "")
            decoded_token = verify_firebase_token(token)
            if not decoded_token:
                print("❌ Invalid Firebase token")
                return jsonify({"error": "Invalid token"}), 401
            g.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            print("❌ Exception in authenticate_request:", e)
            return jsonify({"error": "Auth failed"}), 500
    return decorated
