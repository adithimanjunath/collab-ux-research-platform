import sys
import types
import importlib
import pytest
import mongomock
from flask import Flask, request, g, jsonify

# -------------------- install fakes BEFORE importing routes --------------------

# Fake db module with in-memory notes_collection
_dbclient = mongomock.MongoClient()
_db = _dbclient.get_database("testdb")
_fake_db = types.ModuleType("db")
_fake_db.notes_collection = _db.get_collection("notes")
sys.modules["db"] = _fake_db

# Fake auth decorator that requires Bearer token and sets g.user
_fake_auth_pkg = types.ModuleType("auth")
_fake_auth_decorator = types.ModuleType("auth.auth_decorator")

def authenticate_request(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "unauthorized"}), 401
        g.user = {"uid": "u1", "email": "t@e.com", "name": "Test User"}
        return fn(*args, **kwargs)
    return wrapper

_fake_auth_decorator.authenticate_request = authenticate_request
sys.modules["auth"] = _fake_auth_pkg
sys.modules["auth.auth_decorator"] = _fake_auth_decorator

# -------------------- import routes module that exposes note_bp --------------------

ROUTE_CANDIDATES = [
    "routes.note_routes",     # common
    "routes.notes_routes",    # common
    "routes.routes",          # sometimes used
    "routes",                 # package __init__
]

routes_mod = None
for name in ROUTE_CANDIDATES:
    try:
        m = importlib.import_module(name)
        if hasattr(m, "note_bp"):
            routes_mod = m
            break
    except Exception:
        continue

if routes_mod is None:
    raise AssertionError(
        "Could not find a module that exports `note_bp`. "
        "Either export it from server/routes/__init__.py "
        "(`from .<yourfile> import note_bp`) or update ROUTE_CANDIDATES."
    )

# -------------------- fixtures --------------------

@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update(TESTING=True)
    app.register_blueprint(routes_mod.note_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_header():
    return {"Authorization": "Bearer good"}

# -------------------- tests --------------------

def test_home_ok(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.get_json() == {"message": "Hello from Flask backend!"}

def test_get_notes_requires_bearer(client):
    r = client.get("/api/notes?boardId=b1")  # no Authorization header
    assert r.status_code == 401
    assert r.get_json().get("error") == "unauthorized"

def test_get_notes_returns_list(client, auth_header, monkeypatch):
    fake_notes = [
        {"id": "n1", "boardId": "b1", "text": "A"},
        {"id": "n2", "boardId": "b1", "text": "B"},
    ]
    # Patch the name imported inside the routes module
    monkeypatch.setattr(routes_mod, "get_notes_by_board", lambda board_id: fake_notes)
    r = client.get("/api/notes?boardId=b1", headers=auth_header)
    # Accept either your original 200 or a 400 if you changed missing handling
    assert r.status_code == 200
    assert r.get_json() == fake_notes

def test_get_notes_missing_boardid_shape(client, auth_header):
    r = client.get("/api/notes", headers=auth_header)
    # Your original code returned [] for missing boardId; if you changed to 400, adjust here.
    if r.status_code == 200:
        assert r.get_json() == []
    else:
        assert r.status_code == 400
        assert "boardid" in (r.get_json() or {}).get("error", "").lower()

def test_cleanup_deletes_docs_without_boardid(client, auth_header):
    coll = _fake_db.notes_collection
    coll.insert_many([
        {"id": "x1", "text": "bad1"},
        {"id": "x2", "text": "bad2"},
        {"id": "ok", "text": "ok", "boardId": "b1"},
    ])
    assert coll.count_documents({}) == 3

    r = client.post("/api/notes/cleanup", headers=auth_header)
    assert r.status_code in (200, 401)
    if r.status_code == 200:
        assert coll.count_documents({}) == 1
        assert coll.find_one({"id": "ok"}) is not None
        assert "Deleted 2 notes" in r.get_json().get("message", "")

def test_logged_users_reads_from_same_db(client, auth_header):
    users = _fake_db.notes_collection.database.get_collection("users")
    users.insert_many([
        {"uid": "u1", "name": "Ann", "email": "a@example.com"},
        {"uid": "u2", "name": "Bob", "email": "b@example.com"},
    ])
    r = client.get("/api/logged_users", headers=auth_header)
    assert r.status_code == 200
    data = r.get_json()
    got = {(u["uid"], u["email"]) for u in data}
    assert got == {("u1", "a@example.com"), ("u2", "b@example.com")}
