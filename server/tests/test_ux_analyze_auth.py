# server/tests/test_ux_analyze_auth.py
import pytest
from flask import Flask

@pytest.fixture()
def app_with_ux(monkeypatch):
    # Patch the exact verifier used by the require_auth decorator
    import auth.auth_decorator as adec
    monkeypatch.setattr(
        adec,
        "verify_firebase_token",
        lambda tok: {"uid": "u1", "email": "u@example.com", "name": "User"} if tok == "good" else None,
        raising=True,
    )

    # Import the blueprint and make analysis deterministic/offline
    from routes.ux_report_routes import ux_bp
    import routes.ux_report_routes as uxmod
    monkeypatch.setattr(
        uxmod,
        "analyze_text_blob",
        lambda text: {
            "top_insight": "ok",
            "pie_data": [],
            "insights": {},
            "positive_highlights": [],
            "delight_distribution": [],
        },
        raising=True,
    )

    app = Flask(__name__)
    app.register_blueprint(ux_bp)
    return app


def test_analyze_allows_valid_token(app_with_ux):
    c = app_with_ux.test_client()
    r = c.post("/api/ux/analyze", json={"text": "hello"}, headers={"Authorization": "Bearer good"})
    assert r.status_code == 200
    body = r.get_json()
    for key in ("top_insight", "pie_data", "insights", "positive_highlights", "delight_distribution"):
        assert key in body


def test_analyze_requires_auth_missing_header(app_with_ux):
    c = app_with_ux.test_client()
    r = c.post("/api/ux/analyze", json={"text": "hello"})
    assert r.status_code == 401


def test_analyze_requires_auth_invalid_token(app_with_ux):
    c = app_with_ux.test_client()
    r = c.post("/api/ux/analyze", json={"text": "hello"}, headers={"Authorization": "Bearer bad"})
    assert r.status_code == 401


def test_analyze_options_preflight(app_with_ux):
    c = app_with_ux.test_client()
    r = c.open("/api/ux/analyze", method="OPTIONS")
    assert r.status_code == 200