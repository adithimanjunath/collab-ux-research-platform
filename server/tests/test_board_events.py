import pytest
from flask import Flask
from flask_socketio import SocketIO


@pytest.fixture()
def app_socket(monkeypatch):
    import sys, types
    # Install a fake 'db' module to avoid real Mongo connections during import
    fake_db = types.ModuleType("db")
    fake_db.notes_collection = object()  # placeholder, not used directly here
    sys.modules.setdefault("db", fake_db)

    # Pre-install a minimal auth.firebase_verify to avoid Firebase init side effects
    auth_pkg = sys.modules.get("auth")
    if auth_pkg is None:
        auth_pkg = types.ModuleType("auth")
        auth_pkg.__path__ = []  # mark as package
        sys.modules["auth"] = auth_pkg
    fake_verify = types.ModuleType("auth.firebase_verify")
    fake_verify.verify_firebase_token = lambda token: None
    sys.modules["auth.firebase_verify"] = fake_verify

    # Now import the module under test
    from events import board_events as be

    # Reset in-memory presence between tests
    be.online_users.clear()
    be.sid_to_uid.clear()
    be.latest_sid_by_uid.clear()

    # Stub Firebase admin token verification used by join_board
    class _AuthStub:
        @staticmethod
        def verify_id_token(token):
            if token == "good-u1":
                return {"uid": "u1", "name": "User One", "email": "u1@example.com"}
            if token == "good-u2":
                return {"uid": "u2", "name": "User Two", "email": "u2@example.com"}
            raise ValueError("bad token")

    monkeypatch.setattr(be, "fb_auth", _AuthStub)

    # Minimal Flask app + SocketIO, register handlers
    app = Flask(__name__)
    app.config["TESTING"] = True
    sio = SocketIO(app, async_mode="threading", cors_allowed_origins="*")
    be.register_socket_events(sio)

    yield app, sio, be


def make_client(sio, app):
    return sio.test_client(app, flask_test_client=app.test_client())


def received_events(client):
    # Helper to pull and normalize events from default namespace
    return client.get_received()


def take_event(client, name):
    # Convenience for single-event interactions
    events = received_events(client)
    for evt in events:
        if evt.get("name") == name:
            return evt
    return None

def find_event(events, name):
    for evt in events:
        if evt.get("name") == name:
            return evt
    return None


def test_join_denied_without_board_id(app_socket):
    app, sio, be = app_socket
    c1 = make_client(sio, app)
    c1.emit("join_board", {"token": "good-u1"})  # missing boardId
    evt = take_event(c1, "join_denied")
    assert evt is not None
    assert "Missing boardId" in (evt["args"][0] or {}).get("reason", "")


def test_join_denied_with_bad_token(app_socket):
    app, sio, be = app_socket
    c1 = make_client(sio, app)
    c1.emit("join_board", {"boardId": "b1", "token": "bad"})
    evt = take_event(c1, "join_denied")
    assert evt is not None
    assert "Invalid" in (evt["args"][0] or {}).get("reason", "")


def test_join_granted_loads_notes_and_no_demo_wait_for_first_user(app_socket, monkeypatch):
    app, sio, be = app_socket

    # Provide a deterministic snapshot of existing notes
    notes = [
        {"id": "n1", "boardId": "b1", "text": "A"},
        {"id": "n2", "boardId": "b1", "text": "B"},
    ]
    monkeypatch.setattr(be, "get_notes_by_board", lambda board_id: notes)

    c1 = make_client(sio, app)
    c1.emit("join_board", {"boardId": "b1", "token": "good-u1"})

    # Self gets granted and a full snapshot (same tick)
    evs = received_events(c1)
    granted = find_event(evs, "join_granted")
    assert granted is not None
    load = find_event(evs, "load_existing_notes")
    assert load is not None
    assert load["args"][0]["boardId"] == "b1"
    assert load["args"][0]["notes"] == notes

    # First user should not get demo_wait
    assert take_event(c1, "demo_wait") is None

    # Presence updated
    assert be.online_users.get("b1", {}).get("u1") is not None


def test_second_joiner_receives_demo_wait_and_first_receives_user_joined(app_socket):
    app, sio, be = app_socket
    c1 = make_client(sio, app)
    c2 = make_client(sio, app)

    c1.emit("join_board", {"boardId": "b1", "token": "good-u1"})
    # Clear c1 inbox to inspect only events from second join
    received_events(c1)

    c2.emit("join_board", {"boardId": "b1", "token": "good-u2"})

    # Second user sees a brief waiting instruction
    assert take_event(c2, "demo_wait") is not None
    # First user is notified that someone joined
    joined = take_event(c1, "user_joined")
    assert joined is not None
    payload = joined["args"][0]
    assert payload["uid"] == "u2"


def test_get_online_users_returns_list_and_user_list(app_socket):
    app, sio, be = app_socket
    c1 = make_client(sio, app)
    c1.emit("join_board", {"boardId": "b1", "token": "good-u1"})
    # Drain join events
    received_events(c1)

    c1.emit("get_online_users", {"boardId": "b1"})
    evs = received_events(c1)
    ev1 = find_event(evs, "online_users")
    ev2 = find_event(evs, "user_list")
    assert ev1 and ev2
    online = ev1["args"][0]
    assert isinstance(online, list) and online and online[0]["uid"] == "u1"
    assert ev2["args"][0]["boardId"] == "b1"


def test_leave_board_updates_presence_and_notifies_others(app_socket):
    app, sio, be = app_socket
    c1 = make_client(sio, app)
    c2 = make_client(sio, app)
    c1.emit("join_board", {"boardId": "b1", "token": "good-u1"})
    c2.emit("join_board", {"boardId": "b1", "token": "good-u2"})
    # Drain inboxes
    received_events(c1); received_events(c2)

    c2.emit("leave_board", {"boardId": "b1"})
    # First user should see user_left
    left = take_event(c1, "user_left")
    assert left is not None
    assert left["args"][0]["uid"] == "u2"
    # Presence pruned
    assert "u2" not in be.online_users.get("b1", {})


def test_disconnect_behaves_like_leave_board(app_socket):
    app, sio, be = app_socket
    c1 = make_client(sio, app)
    c2 = make_client(sio, app)
    c1.emit("join_board", {"boardId": "b1", "token": "good-u1"})
    c2.emit("join_board", {"boardId": "b1", "token": "good-u2"})
    received_events(c1); received_events(c2)

    c2.disconnect()
    left = take_event(c1, "user_left")
    assert left is not None
    assert left["args"][0]["uid"] == "u2"
    assert "u2" not in be.online_users.get("b1", {})


def test_note_events_authorization_guard(app_socket, monkeypatch):
    app, sio, be = app_socket
    c = make_client(sio, app)
    c.emit("join_board", {"boardId": "b1", "token": "good-u1"})
    received_events(c)

    # Reject tokens via verify_firebase_token
    monkeypatch.setattr(be, "verify_firebase_token", lambda tok: None)

    for name, payload in [
        ("create_note", {"id": "n1", "boardId": "b1", "text": "A", "token": "bad"}),
        ("edit_note",   {"id": "n1", "boardId": "b1", "text": "B", "x": 1, "y": 1, "user": {"uid": "u1"}, "token": "bad"}),
        ("move_note",   {"id": "n1", "boardId": "b1", "x": 2, "y": 3, "token": "bad"}),
        ("delete_note", {"id": "n1", "boardId": "b1", "token": "bad"}),
    ]:
        c.emit(name, payload)
        evt = take_event(c, "Unauthorized")
        assert evt is not None, f"expected Unauthorized for {name}"
        # drain any remaining
        received_events(c)


def test_create_edit_move_delete_note_happy_paths(app_socket, monkeypatch):
    app, sio, be = app_socket
    c = make_client(sio, app)
    c.emit("join_board", {"boardId": "b1", "token": "good-u1"})
    received_events(c)

    monkeypatch.setattr(be, "verify_firebase_token", lambda tok: {"uid": "u1"})

    called = {"create": None, "update": [], "delete": None}

    def _create(data):
        called["create"] = data.copy()

    def _update(note_id, patch):
        called["update"].append((note_id, patch.copy()))

    def _delete(note_id):
        called["delete"] = note_id

    monkeypatch.setattr(be, "create_note", _create)
    monkeypatch.setattr(be, "update_note", _update)
    monkeypatch.setattr(be, "delete_note", _delete)

    # create
    new_note = {"id": "n1", "boardId": "b1", "text": "A", "x": 0, "y": 0, "user": {"uid": "u1"}, "token": "t"}
    c.emit("create_note", new_note.copy())
    evt = take_event(c, "new_note")
    assert evt and evt["args"][0]["id"] == "n1"
    assert called["create"]["id"] == "n1"

    # edit
    edit = {"id": "n1", "boardId": "b1", "text": "B", "x": 1, "y": 1, "user": {"uid": "u1"}, "token": "t"}
    c.emit("edit_note", edit.copy())
    evt = take_event(c, "note_edited")
    assert evt and evt["args"][0]["text"] == "B"
    assert ("n1", {"text": "B", "x": 1, "y": 1, "user": {"uid": "u1"}}) in called["update"]

    # move
    move = {"id": "n1", "boardId": "b1", "x": 5, "y": 6, "token": "t"}
    c.emit("move_note", move.copy())
    evt = take_event(c, "note_moved")
    assert evt and evt["args"][0]["x"] == 5
    assert ("n1", {"x": 5, "y": 6}) in called["update"]

    # delete
    dele = {"id": "n1", "boardId": "b1", "token": "t"}
    c.emit("delete_note", dele.copy())
    evt = take_event(c, "note_deleted")
    assert evt and evt["args"][0]["id"] == "n1"
    assert called["delete"] == "n1"
