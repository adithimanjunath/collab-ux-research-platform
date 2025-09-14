# server/tests/test_report_snapshot.py
import json
import pathlib
import importlib

SNAP = pathlib.Path("server/tests/_snapshots/report_v1.json")

def test_build_report_snapshot(monkeypatch, app):
    # ✅ Patch the verifier used by the require_auth decorator
    import auth.auth_decorator as adec
    monkeypatch.setattr(adec, "verify_firebase_token", lambda *_: {"uid": "U1"}, raising=True)

    # Import the route module after auth is patched
    routes = importlib.import_module("server.routes.ux_report_routes")

    # Deterministic analysis output (so the snapshot is stable)
    dummy_report = {
        "top_insight": "Users like design; performance needs work.",
        "pie_data": [
            {"label": "Usability", "value": 1},
            {"label": "Performance", "value": 1},
        ],
        "insights": [
            {"category": "Usability", "items": ["UI fast"]},
            {"category": "Performance", "items": ["Search slow"]},
        ],
        "positive_highlights": ["UI fast"],
        "delight_distribution": [{"label": "Usability", "value": 1}],
    }

    # Patch whichever callable the route uses for analysis
    if hasattr(routes, "analyze_feedback_items"):
        monkeypatch.setattr(routes, "analyze_feedback_items", lambda *a, **k: dummy_report, raising=True)
    else:
        svc = importlib.import_module("server.services.ux_report_service")
        if hasattr(svc, "analyze_feedback_items"):
            monkeypatch.setattr(svc, "analyze_feedback_items", lambda *a, **k: dummy_report, raising=True)
        elif hasattr(svc, "build_report"):
            monkeypatch.setattr(svc, "build_report", lambda *a, **k: dummy_report, raising=True)

    client = app.test_client()
    resp = client.post(
        "/api/ux/analyze",
        json={"text": "UI fast\nSearch slow", "labels": ["Usability", "Performance"]},
        headers={"Authorization": "Bearer good"},
    )
    assert resp.status_code == 200
    report = resp.get_json()

    # Snapshot compare
    SNAP.parent.mkdir(parents=True, exist_ok=True)
    if not SNAP.exists():
        SNAP.write_text(json.dumps(report, indent=2, sort_keys=True))
    expected = json.loads(SNAP.read_text())
    assert report == expected