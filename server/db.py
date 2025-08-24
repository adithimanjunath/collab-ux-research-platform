import os, logging
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError


# Use the value from Render's environment settings
mongo_uri = os.environ.get("MONGO_URI") or "mongodb://localhost:27017/"

client = None
db = None
notes_collection = None

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000, tls=True)
    client.admin.command("ping")  # simple check

    db_name = (mongo_uri.split("/")[-1].split("?")[0] or "ux_research")
    db = client[db_name]

    notes_collection = db["notes"]
    boards_collection = db["boards"]

    logging.info("✅ Connected to MongoDB Atlas and ping succeeded.")
except PyMongoError as e:
    logging.exception("❌ MongoDB connection failed. Check MONGO_URI, IP allowlist, and credentials.")
    raise
__all__ = ["client", "db", "notes_collection"]