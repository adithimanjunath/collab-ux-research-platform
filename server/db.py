from pymongo import MongoClient

client = MongoClient("mongodb://mongodb:27017/")
db = client.ux_research
notes_collection = db.notes
