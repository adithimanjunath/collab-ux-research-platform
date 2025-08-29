import pytest


def _mk_stub_pipes(forced_scores=None):
    forced_scores = forced_scores or {}

    def classifier(seqs, *, candidate_labels, multi_label=True, batch_size=None, truncation=True, hypothesis_template=None):
        def one(_):
            labels = list(candidate_labels)
            scores = [float(forced_scores.get(l, 0.0)) for l in labels]
            if multi_label:
                return {"labels": labels, "scores": scores}
            if not labels:
                return {"labels": [], "scores": []}
            best_i = max(range(len(labels)), key=lambda i: scores[i] if i < len(scores) else 0.0)
            return {"labels": [labels[best_i]], "scores": [scores[best_i]]}
        if isinstance(seqs, (list, tuple)):
            return [one(s) for s in seqs]
        return one(seqs)

    def sentiment(seqs, batch_size=None, truncation=True):
        def one(text):
            t = str(text).lower()
            neg = any(k in t for k in ["confus", "slow", "hard", "error", "issue", "not "])
            return {"label": "NEGATIVE" if neg else "POSITIVE", "score": 0.9}
        if isinstance(seqs, (list, tuple)):
            return [one(s) for s in seqs]
        return one(seqs)

    def summarizer(text, max_length=60, min_length=20, do_sample=False):
        return [{"summary_text": "sum"}]

    return classifier, sentiment, summarizer


def test_negation_safe_problem_phrases_not_flags():
    from models.hf_zero_shot import HFZeroShotModel
    assert HFZeroShotModel._has_suggestion_keyword("No major issues encountered so far.") is False
    assert HFZeroShotModel._has_suggestion_keyword("Works without problems on my device.") is False
    assert HFZeroShotModel._has_suggestion_keyword("This is not good and feels confusing.") is True


def test_performance_false_positive_is_removed_by_guard(monkeypatch):
    from models.hf_zero_shot import HFZeroShotModel
    m = HFZeroShotModel()
    pipes = _mk_stub_pipes({"Performance": 0.95})
    monkeypatch.setattr(HFZeroShotModel, "_get_pipes", classmethod(lambda cls: pipes))
    items = ["The settings are confusing to navigate."]
    out = m.analyze_feedback_items(items)
    assert "Performance" not in out.get("insights", {})


def test_responsiveness_heuristics_fill_in_when_layout_breaks_mobile(monkeypatch):
    from models.hf_zero_shot import HFZeroShotModel
    m = HFZeroShotModel()
    pipes = _mk_stub_pipes({})
    monkeypatch.setattr(HFZeroShotModel, "_get_pipes", classmethod(lambda cls: pipes))
    items = ["The layout breaks and overlaps on mobile screens, an issue."]
    out = m.analyze_feedback_items(items)
    assert "Responsiveness" in out.get("insights", {})


def test_navigation_heuristic_for_couldnt_find_submit_button(monkeypatch):
    from models.hf_zero_shot import HFZeroShotModel
    m = HFZeroShotModel()
    pipes = _mk_stub_pipes({})
    monkeypatch.setattr(HFZeroShotModel, "_get_pipes", classmethod(lambda cls: pipes))
    items = ["I couldn't find the submit button anywhere, hard to locate."]
    out = m.analyze_feedback_items(items)
    assert "Navigation" in out.get("insights", {})


def test_delight_max_items_cap(monkeypatch):
    from models.hf_zero_shot import HFZeroShotModel
    m = HFZeroShotModel()
    pipes = _mk_stub_pipes({"Visual Design": 0.99})
    monkeypatch.setattr(HFZeroShotModel, "_get_pipes", classmethod(lambda cls: pipes))
    monkeypatch.setattr(HFZeroShotModel, "DELIGHT_MAX_ITEMS", 1)
    items = [
        "Beautiful and modern design!",
        "Nice clean UI",
        "Great visuals throughout",
    ]
    out = m.analyze_feedback_items(items)
    dd = {d["name"]: d["value"] for d in out["delight_distribution"]}
    assert sum(dd.values()) == 1

