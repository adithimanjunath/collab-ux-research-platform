import sys
import types
import pytest


@pytest.fixture(autouse=True)
def fake_hf_client_module(monkeypatch):
    """Install a fake services.hf_client module before the model creates pipelines."""
    mod = types.ModuleType("services.hf_client")

    def sa_single(text: str):
        t = text.lower()
        # simple heuristic: negative if common critique keywords present
        neg = any(k in t for k in ["confus", "slow", "bug", "issue", "hard", "not working"]) 
        return {"label": "NEGATIVE" if neg else "POSITIVE", "score": 0.85}

    def zsc_single(text: str, labels, *, multi_label=True, hypothesis_template="This text is about {}."):
        t = text.lower()
        # base scores
        scores = {lab: 0.05 for lab in labels}
        if "confus" in t or "not intuitive" in t:
            scores["Usability"] = 0.92
        if "slow" in t or "lag" in t:
            scores["Performance"] = 0.95
        if "navigation" in t or "hard to find" in t or "find the settings" in t:
            scores["Navigation"] = max(scores.get("Navigation", 0.05), 0.91)
        if any(w in t for w in ["responsive", "mobile", "tablet", "unresponsive"]):
            scores["Responsiveness"] = max(scores.get("Responsiveness", 0.05), 0.9)
        if any(w in t for w in ["clean", "beautiful", "nice", "modern", "great", "awesome"]):
            scores["Visual Design"] = max(scores.get("Visual Design", 0.05), 0.93)
        if multi_label:
            return {"labels": list(labels), "scores": [scores[lab] for lab in labels]}
        # single-label: return top-1 as first element
        if scores:
            best = max(scores.items(), key=lambda kv: kv[1])
            return {"labels": [best[0]], "scores": [best[1]]}
        return {"labels": [], "scores": []}

    def sum_single(text: str, *, max_length=60, min_length=20, do_sample=False):
        return [{"summary_text": "summary: " + text[:60]}]

    mod.sa_single = sa_single
    mod.zsc_single = zsc_single
    mod.sum_single = sum_single

    sys.modules["services.hf_client"] = mod
    yield
    # cleanup not necessary; tests run in one process


def test_empty_input_returns_defaults():
    from models.hf_zero_shot import HFZeroShotModel
    m = HFZeroShotModel()
    out = m.analyze_feedback_items([])
    assert out["top_insight"] == "No strong themes detected."
    assert out["pie_data"] == []
    assert out["positive_highlights"] == []
    assert isinstance(out["insights"], dict) and out["insights"] == {}


def test_critiques_and_delight_paths():
    from models.hf_zero_shot import HFZeroShotModel
    m = HFZeroShotModel()

    items = [
        "The dashboard is confusing and the settings are hard to find.",
        "The app is slow on mobile.",
        "I love the clean and beautiful design!",
    ]
    out = m.analyze_feedback_items(items)

    # Insights should contain Usability and Performance (order may be preference-based)
    keys = list(out["insights"].keys())
    assert "Usability" in keys
    assert "Performance" in keys or "Responsiveness" in keys  # slow on mobile may map to both

    # Pie data should reflect counts from insights
    pie_names = [s["name"] for s in out["pie_data"]]
    assert any(n in pie_names for n in ("Usability", "Performance", "Responsiveness"))

    # Delight should attribute the positive comment to a top-1 label with score >= threshold
    dd = {d["name"]: d["value"] for d in out["delight_distribution"]}
    assert sum(dd.values()) >= 1
    assert any(v > 0 for v in dd.values())

    # Positive highlights contains a cleaned praise clause
    assert out["positive_highlights"]


def test_helpers_strip_and_extract_and_dedupe():
    from models.hf_zero_shot import HFZeroShotModel
    # mixed clause handling
    s = "The UI is great but the settings panel is confusing."
    assert HFZeroShotModel._strip_mixed_clause(s).lower().startswith("the settings")
    # praise clause extraction
    p = "Although navigation is confusing, the dashboard is great and modern."
    out = HFZeroShotModel._extract_praise_clause(p)
    assert "great" in out.lower()
    # dedupe keep order
    arr = ["A", "B", "a", "C", "b", "B"]
    assert HFZeroShotModel._dedupe_keep_order(arr) == ["A", "B", "C"]


def test_mixed_clause_variants_extraction():
    from models.hf_zero_shot import HFZeroShotModel
    s1 = "The UI is great, but the menu is confusing."
    stripped = HFZeroShotModel._strip_mixed_clause(s1)
    assert stripped.lower().startswith("the menu is confusing")
    s2 = "Although the layout is modern, it is hard to navigate."
    stripped2 = HFZeroShotModel._strip_mixed_clause(s2)
    assert stripped2.lower().startswith("it is hard to navigate")
    # Praise extraction with 'however' and 'although'
    p1 = "It's confusing; however the design is great and modern."
    praise1 = HFZeroShotModel._extract_praise_clause(p1)
    assert "great" in praise1.lower()
    p2 = "Although performance is slow, I like the visuals."
    praise2 = HFZeroShotModel._extract_praise_clause(p2)
    assert "like" in praise2.lower()
