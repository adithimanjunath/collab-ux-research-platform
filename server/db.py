import os
from pymongo import MongoClient, ASCENDING, errors
# Use the value from Render's environment settings
mongo_uri = os.environ.get("MONGO_URI")

# Fallback for local dev (optional)
if not mongo_uri:
    mongo_uri = "mongodb://localhost:27017/"

client = MongoClient(mongo_uri)
db = client["ux_research"]
notes_collection = db["notes"]
