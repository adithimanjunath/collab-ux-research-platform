import os,json, firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, initialize_app

load_dotenv()

# Parse the JSON from environment variable
cred_json_str = os.getenv("FIREBASE_CREDENTIAL_JSON")
if not cred_json_str:
    raise ValueError("FIREBASE_CREDENTIAL_JSON is missing from environment.")

cred_dict = json.loads(cred_json_str)

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
