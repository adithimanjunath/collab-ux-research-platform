import os, sys,pytest
import os
import pytest

ROOT = os.path.dirname(os.path.dirname(__file__))  # .../server
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


@pytest.fixture(autouse=True)
def set_dummy_model_env(monkeypatch):
    # Use the fast deterministic model in tests
    monkeypatch.setenv("UX_MODEL", "dummy")

@pytest.fixture(scope="session")
def app():
    # import AFTER env so db.py uses mongomock
    from server.app import app as flask_app
    flask_app.config.update(TESTING=True)
    return flask_app

@pytest.fixture()
def client(app):
    return app.test_client()

@pytest.fixture()
def sio_client(app):
    from server.app import socketio
    from flask_socketio import SocketIOTestClient
    tc = socketio.test_client(app, flask_test_client=app.test_client())
    yield tc
    try:
        tc.disconnect()
    except Exception:
        pass