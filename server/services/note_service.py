from db import notes_collection

def get_notes_by_board(board_id):
    return list(notes_collection.find({"boardId": board_id}, {"_id": 0}))

def create_note(note):
    notes_collection.insert_one(note)

def update_note(note_id, fields):
    notes_collection.update_one({"id": note_id}, {"$set": fields})

def delete_note(note_id):
    notes_collection.delete_one({"id": note_id})
