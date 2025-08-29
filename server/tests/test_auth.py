import sys
import types
import importlib
import pytest
from flask import Flask, jsonify, g


def _install_fake_verify_module(valid_tokens=None):
    valid_tokens = valid_tokens or {}
    mod = types.ModuleType("auth.firebase_verify")

    def verify_firebase_token(token):
        return valid_tokens.get(token)

    mod.verify_firebase_token = verify_firebase_token
    sys.modules["auth.firebase_verify"] = mod
    return mod


def _ensure_real_auth_package():
    # Drop any test-installed fakes from other suites
    for name in [
        "auth.auth_decorator",
        "auth.firebase_verify",
        "auth.firebase_config",
        "auth",
    ]:
        if name in sys.modules:
            del sys.modules[name]


def test_authenticate_request_missing_header():
    _ensure_real_auth_package()
    _install_fake_verify_module({})
    from auth.auth_decorator import authenticate_request

    app = Flask(__name__)

    @app.route("/p")
    @authenticate_request
    def protected():
        return jsonify({"ok": True})

    c = app.test_client()
    r = c.get("/p")
    assert r.status_code == 401
    assert "Missing token" in (r.get_json() or {}).get("error", "")


def test_authenticate_request_invalid_token():
    # Fake verify returns None for provided token
    _ensure_real_auth_package()
    _install_fake_verify_module({})
    from auth.auth_decorator import authenticate_request

    app = Flask(__name__)

    @app.route("/p")
    @authenticate_request
    def protected():
        return jsonify({"ok": True})

    c = app.test_client()
    r = c.get("/p", headers={"Authorization": "Bearer bad"})
    assert r.status_code == 401
    assert "Invalid token" in (r.get_json() or {}).get("error", "")


def test_authenticate_request_valid_token_sets_g_user():
    good = {"uid": "u1", "email": "u1@example.com", "name": "User One"}
    _ensure_real_auth_package()
    _install_fake_verify_module({"good": good})
    from auth.auth_decorator import authenticate_request

    app = Flask(__name__)

    @app.route("/p")
    @authenticate_request
    def protected():
        assert g.user["uid"] == "u1"
        assert g.user["email"] == "u1@example.com"
        return jsonify({"ok": True, "uid": g.user["uid"]})

    c = app.test_client()
    r = c.get("/p", headers={"Authorization": "Bearer good"})
    assert r.status_code == 200
    assert r.get_json().get("uid") == "u1"


def test_verify_firebase_token_success(monkeypatch):
    # Ensure import won't try to initialize real firebase
    _ensure_real_auth_package()
    sys.modules.setdefault("auth", importlib.import_module("auth"))
    sys.modules.setdefault("auth.firebase_config", types.ModuleType("auth.firebase_config"))
    import firebase_admin
    monkeypatch.setenv("FIREBASE_CREDENTIAL_JSON", "{}")
    # Make initialize a no-op and avoid real cert usage
    monkeypatch.setattr(firebase_admin, "_apps", [], raising=False)
    monkeypatch.setattr("firebase_admin.credentials.Certificate", lambda d: object(), raising=False)
    monkeypatch.setattr("firebase_admin.initialize_app", lambda cred: None, raising=False)

    # Import the module and patch the verify function
    import auth.firebase_verify as fv
    called = {}

    def fake_verify(token):
        called["token"] = token
        return {"uid": "uX"}

    monkeypatch.setattr(fv.firebase_auth, "verify_id_token", fake_verify)
    out = fv.verify_firebase_token("tok")
    assert out == {"uid": "uX"}
    assert called["token"] == "tok"


def test_verify_firebase_token_exception_returns_none(monkeypatch):
    _ensure_real_auth_package()
    sys.modules.setdefault("auth", importlib.import_module("auth"))
    sys.modules.setdefault("auth.firebase_config", types.ModuleType("auth.firebase_config"))
    import firebase_admin
    monkeypatch.setenv("FIREBASE_CREDENTIAL_JSON", "{}")
    monkeypatch.setattr(firebase_admin, "_apps", [], raising=False)
    monkeypatch.setattr("firebase_admin.credentials.Certificate", lambda d: object(), raising=False)
    monkeypatch.setattr("firebase_admin.initialize_app", lambda cred: None, raising=False)

    fv = importlib.import_module("auth.firebase_verify")

    def boom(token):
        raise ValueError("bad token")

    monkeypatch.setattr(fv.firebase_auth, "verify_id_token", boom)
    assert fv.verify_firebase_token("tok") is None
