# server/tests/test_notes_service.py
import sys
import types
import pytest
import mongomock

# --- 1) Install a fake 'db' module BEFORE importing the service under test ---
_client = mongomock.MongoClient()
_db = _client.get_database("testdb")
_fake_db_module = types.ModuleType("db")
_fake_db_module.notes_collection = _db.get_collection("notes")
sys.modules["db"] = _fake_db_module  # must happen before importing repo

# --- 2) Now import your service (pick the correct name) ---
# If your file is server/services/notes_service.py:
import services.note_service as repo
# If your file is server/services/note_service.py, use this instead:
# import services.note_service as repo


# --- 3) Fixtures: in-memory collection + patch the module's notes_collection ---
@pytest.fixture
def fake_collection():
    client = mongomock.MongoClient()
    db = client.get_database("testdb")
    return db.get_collection("notes")

@pytest.fixture(autouse=True)
def patch_collection(monkeypatch, fake_collection):
    monkeypatch.setattr(repo, "notes_collection", fake_collection)
    return fake_collection


# --- 4) Tests ---
def test_get_notes_by_board_filters_id_and_user_email(fake_collection):
    fake_collection.insert_many([
        {
            "_id": "mongo-id-1",
            "id": "n1",
            "boardId": "b1",
            "text": "A",
            "x": 10, "y": 20,
            "type": "note",
            "user": {"uid": "u1", "name": "Ann", "email": "a@example.com"},
        },
        {
            "_id": "mongo-id-2",
            "id": "n2",
            "boardId": "b2",
            "text": "B",
            "x": 0, "y": 0,
            "type": "idea",
            "user": {"uid": "u2", "name": "Bob", "email": "b@example.com"},
        },
    ])

    out = repo.get_notes_by_board("b1")
    assert isinstance(out, list) and len(out) == 1

    doc = out[0]
    assert doc["id"] == "n1"
    assert doc["boardId"] == "b1"
    assert doc["user"]["name"] == "Ann"
    assert "_id" not in doc
    assert "email" not in doc.get("user", {})

def test_create_note_inserts_with_default_type(fake_collection):
    note = {
        "id": "n3",
        "text": "Hello",
        "x": 1, "y": 2,
        "user": {"uid": "u3", "name": "Chris", "email": "c@example.com"},
        "boardId": "b1",
    }
    repo.create_note(note)
    stored = fake_collection.find_one({"id": "n3"})
    assert stored is not None
    assert stored["boardId"] == "b1"
    assert stored["type"] == "note"  # default applied

def test_create_note_requires_board_id():
    bad = {
        "id": "nX",
        "text": "No boardId",
        "x": 0, "y": 0,
        "user": {"uid": "u", "name": "N"},
        # missing boardId
    }
    with pytest.raises(ValueError, match="boardId"):
        repo.create_note(bad)

def test_update_note_sets_fields(fake_collection):
    fake_collection.insert_one({
        "id": "n4", "boardId": "b1", "text": "Old", "x": 0, "y": 0,
        "type": "note", "user": {"uid": "u4", "name": "Dana", "email": "d@e.com"}
    })
    repo.update_note("n4", {"text": "New", "x": 5})
    doc = fake_collection.find_one({"id": "n4"})
    assert doc["text"] == "New"
    assert doc["x"] == 5
    assert doc["y"] == 0  # unchanged

def test_delete_note_removes_document(fake_collection):
    fake_collection.insert_one({"id": "n5", "boardId": "b1"})
    assert fake_collection.count_documents({"id": "n5"}) == 1
    repo.delete_note("n5")
    assert fake_collection.count_documents({"id": "n5"}) == 0
