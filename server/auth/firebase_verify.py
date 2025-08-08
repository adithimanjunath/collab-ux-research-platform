
from auth import firebase_config
from firebase_admin import auth as firebase_auth

def verify_firebase_token(token):
    try:
        return firebase_auth.verify_id_token(token)
    except Exception as e:
        print("❌ Firebase token error:", e)
        return None
