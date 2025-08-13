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

def ensure_indexes():
    try:
        # prevent duplicate UUIDs
        notes_collection.create_index(
            [("id", ASCENDING)],
            unique=True,
            name="uniq_note_id",
        )
    except errors.OperationFailure as e:
        # This triggers if duplicates already exist
        print("Couldn't create unique index on notes.id:", e)

    # speed up board loads
    notes_collection.create_index(
        [("boardId", ASCENDING)],
        name="idx_boardId",
    )

ensure_indexes()