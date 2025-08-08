import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
import os, json
from dotenv import load_dotenv
from auth import firebase_config


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'server', '.env'))

if not firebase_admin._apps:
    cred_json = os.getenv("FIREBASE_CREDENTIAL_JSON")
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    print("✅ Firebase initialized with:", cred_dict.get("project_id"))
    
def verify_firebase_token(token):
    try:
        return firebase_auth.verify_id_token(token)
    except Exception as e:
        print("❌ Firebase token error:", e)
        return None
