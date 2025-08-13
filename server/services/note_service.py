from db import notes_collection

def get_notes_by_board(board_id):
    cursor = notes_collection.find({"boardId":board_id}, {"_id":0, "user.email": 0})
    return list(cursor)

def create_note(note):
    if "boardId" not in note:
        raise ValueError("Missing boardId in note data")
    
    notes_collection.insert_one({
        "id": note["id"],
        "text": note["text"],
        "x": note["x"],
        "y": note["y"],
        "user": note["user"],
        "boardId": note["boardId"],
        "type": note.get("type", "note")
    })

def update_note(note_id, fields):
    notes_collection.update_one({"id": note_id}, {"$set": fields})

def delete_note(note_id):
    notes_collection.delete_one({"id": note_id})

