# tests/test_hf_zero_shot_plumbing.py
import pytest

pytestmark = pytest.mark.skipif(False, reason="toggle to True to skip")

from models.hf_zero_shot import HFZeroShotModel

def _install_fake_zero_shot(model, monkeypatch):
    def fake_batch(items):
        out = []
        for it in items:
            if "slow" in it.lower():
                out.append({"label": "Performance", "scores": {"Performance": 0.9, "Usability": 0.1}})
            else:
                out.append({"label": "Usability", "scores": {"Usability": 0.8, "Performance": 0.2}})
        return out

    # Try common private batch names first
    for name in ("_predict_batch", "_zero_shot_batch", "_classify_batch", "_batch"):
        if hasattr(model, name):
            monkeypatch.setattr(model, name, fake_batch, raising=True)
            return

    # Otherwise patch a pipeline-like attribute
    for name in ("pipeline", "_pipeline", "clf", "classifier"):
        if hasattr(model, name):
            class FakePipe:
                def __call__(self, seqs, candidate_labels=None, multi_label=True, **kw):
                    return fake_batch(seqs)
            monkeypatch.setattr(model, name, FakePipe(), raising=False)
            return

    raise RuntimeError("Could not find a seam to patch in HFZeroShotModel")

def test_plumbing_without_hf(monkeypatch):
    m = HFZeroShotModel()
    _install_fake_zero_shot(m, monkeypatch)
    res = m.analyze_feedback_items(["The app is slow", "Easy to navigate"])
    cats = [ins["category"] for ins in (res.get("insights") or [])]
    assert "Performance" in cats and "Usability" in cats