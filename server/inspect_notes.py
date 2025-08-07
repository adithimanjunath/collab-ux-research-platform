from pymongo import MongoClient
from urllib.parse import quote_plus

# Escape special characters
username = quote_plus("adithi")
password = quote_plus("Adithi@1999") 
# Use the escaped values in your URI
uri = f"mongodb+srv://{username}:{password}@cluster0.7frkuxc.mongodb.net/?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true"


client = MongoClient(uri)
db = client["ux_research"]  # 🔁 replace with your DB name
notes = db["notes"]

# 🧹 Find notes missing boardId
bad_notes = list(notes.find({"boardId": {"$exists": False}}))
print(f"Found {len(bad_notes)} notes without boardId.")
for note in bad_notes:
    print(note)

# Uncomment to delete them
# result = notes.delete_many({"boardId": {"$exists": False}})
# print(f"Deleted {result.deleted_count} notes.")
