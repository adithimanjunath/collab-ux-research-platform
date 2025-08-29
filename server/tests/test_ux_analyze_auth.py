import sys
import types
import pytest
from flask import Flask


@pytest.fixture()
def app_with_ux(monkeypatch):
    # Ensure we import the real auth_decorator, but stub firebase_verify to avoid side effects
    import types, sys
    # Remove any prior test-installed fake decorator
    for name in ('auth.auth_decorator','auth'):
        if name in sys.modules:
            del sys.modules[name]
    # Pre-install a lightweight auth.firebase_verify with controlled verify function
    fv = types.ModuleType('auth.firebase_verify')
    fv.verify_firebase_token = lambda tok: ({"uid": "u1", "email": "u@example.com", "name": "User"} if tok == 'good' else None)
    sys.modules['auth.firebase_verify'] = fv

    # Now import the real decorator which will bind to our stub
    from auth import auth_decorator as adec  # noqa: F401

    # Import the blueprint under test
    from routes.ux_report_routes import ux_bp

    # Avoid external calls by stubbing analysis
    import routes.ux_report_routes as uxmod
    monkeypatch.setattr(uxmod, "analyze_text_blob", lambda text: {
        "top_insight": "ok", "pie_data": [], "insights": {}, "positive_highlights": [], "delight_distribution": []
    })

    app = Flask(__name__)
    app.register_blueprint(ux_bp)
    return app


def test_analyze_requires_auth_missing_header(app_with_ux):
    c = app_with_ux.test_client()
    r = c.post("/api/ux/analyze", json={"text": "hello"})
    assert r.status_code == 401


def test_analyze_requires_auth_invalid_token(app_with_ux):
    c = app_with_ux.test_client()
    r = c.post("/api/ux/analyze", json={"text": "hello"}, headers={"Authorization": "Bearer bad"})
    assert r.status_code == 401


def test_analyze_allows_valid_token(app_with_ux):
    c = app_with_ux.test_client()
    r = c.post("/api/ux/analyze", json={"text": "hello"}, headers={"Authorization": "Bearer good"})
    assert r.status_code == 200
    body = r.get_json()
    for key in ("top_insight", "pie_data", "insights", "positive_highlights", "delight_distribution"):
        assert key in body


def test_analyze_options_preflight(app_with_ux):
    c = app_with_ux.test_client()
    r = c.open("/api/ux/analyze", method="OPTIONS")
    assert r.status_code == 200
