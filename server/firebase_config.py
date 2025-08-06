# firebase_config.py
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("path/to/serviceAccountKey.json")  # Download from Firebase
firebase_admin.initialize_app(cred)
