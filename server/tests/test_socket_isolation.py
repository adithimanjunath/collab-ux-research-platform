# server/tests/test_socket_isolation.py
import pytest
pytestmark = pytest.mark.integration

def test_room_isolation(monkeypatch, app):
    from server.app import socketio
    from flask_socketio import SocketIOTestClient
    monkeypatch.setattr("auth.firebase_verify.verify_firebase_token", lambda t: {"uid": "U1"})
    c1 = socketio.test_client(app); c2 = socketio.test_client(app)
    try:
        c1.emit("join_board", {"boardId": "A", "token": "ok"})
        c2.emit("join_board", {"boardId": "B", "token": "ok"})
        c1.emit("create_note", {"id": "n1", "text": "x", "x": 1, "y": 2, "boardId": "A", "token": "ok", "user": {"uid": "U1"}})
        names_c2 = {e["name"] for e in c2.get_received()}
        assert "new_note" not in names_c2
    finally:
        c1.disconnect(); c2.disconnect()