import io
import types
import pytest

import services.ux_report_service as svc

class FakeModel:
    def __init__(self):
        self.last_items = None
    def analyze_feedback_items(self, items):
        self.last_items = list(items)
        # Return shape similar to your API
        return {
            "top_insight": "ok",
            "pie_data": [],
            "insights": items[:3],
            "positive_highlights": [],
            "delight_distribution": [],
        }


@pytest.fixture(autouse=True)
def fake_model(monkeypatch):
    fm = FakeModel()
    monkeypatch.setattr(svc, "get_active_model", lambda: fm, raising=False)
    return fm


# ---------- answers-only extraction ----------

def test_answers_only_extracts_a_lines_and_dedupes():
    text = """
      Q: Something?
      A: First answer
      A: first answer     \n
      A: Second answer!
    """
    out = svc._answers_only_from_text(text)
    assert out == ["First answer", "Second answer!"]  # dedup + normalize

def test_answers_only_sentence_fallback_when_no_a_lines():
    text = "Users liked speed. The UI was confusing at first. Overall good."
    out = svc._answers_only_from_text(text)
    assert out == [
        "Users liked speed.",
        "The UI was confusing at first.",
        "Overall good.",
    ]

def test_answers_only_caps_at_500_items():
    many = "\n".join(f"A: item {i}" for i in range(600))
    out = svc._answers_only_from_text(many)
    assert len(out) == 500
    assert out[0] == "item 0"
    assert out[-1] == "item 499"


# ---------- analyze_* uses model with extracted items ----------

def test_analyze_text_blob_calls_model(fake_model):
    text = "A: Fast\nA: Friendly"
    res = svc.analyze_text_blob(text)
    assert fake_model.last_items == ["Fast", "Friendly"]
    assert res["top_insight"] == "ok"

def test_analyze_uploaded_file_txt_calls_model(fake_model):
    data = b"A: One\nA: Two"
    res = svc.analyze_uploaded_file(data, "feedback.txt")
    assert fake_model.last_items == ["One", "Two"]
    assert res["insights"] == ["One", "Two"]


# ---------- file extraction paths (PDF / DOCX / fallback) ----------

def test_pdf_extraction_via_pypdf2(monkeypatch, fake_model):
    # Force pdfplumber path to be unavailable to hit PyPDF2 branch
    monkeypatch.setattr(svc, "pdfplumber", None, raising=False)

    class FakePage:
        def __init__(self, text): self._t = text
        def extract_text(self): return self._t

    class FakeReader:
        def __init__(self, f): pass
        @property
        def pages(self):
            return [FakePage("A: Alpha"), FakePage("A: Beta")]

    fake_pypdf2 = types.SimpleNamespace(PdfReader=FakeReader)
    monkeypatch.setattr(svc, "PyPDF2", fake_pypdf2, raising=False)

    res = svc.analyze_uploaded_file(b"%PDF-1.4 ...", "file.pdf")
    assert fake_model.last_items == ["Alpha", "Beta"]
    assert res["insights"] == ["Alpha", "Beta"]

def test_docx_extraction(monkeypatch, fake_model):
    class P:  # paragraph shim
        def __init__(self, t): self.text = t

    class FakeDoc:
        def __init__(self, f): pass
        @property
        def paragraphs(self):
            return [P("A: Docx One"), P("A: Docx Two")]

    monkeypatch.setattr(svc, "Document", FakeDoc, raising=False)

    res = svc.analyze_uploaded_file(b"PK\x03\x04...", "file.docx")
    assert fake_model.last_items == ["Docx One", "Docx Two"]
    assert res["insights"] == ["Docx One", "Docx Two"]

def test_unknown_extension_tries_pdf_then_decodes(monkeypatch, fake_model):
    # Make PDF path raise to force decode fallback
    monkeypatch.setattr(svc, "_extract_text_from_pdf_bytes", lambda b: (_ for _ in ()).throw(RuntimeError("nope")))
    data = "A: X\nA: Y".encode("utf-8")
    res = svc.analyze_uploaded_file(data, "file.bin")
    assert fake_model.last_items == ["X", "Y"]


# ---------- model registry guard ----------

def test_require_model_raises_when_registry_missing(monkeypatch):
    # Simulate registry not present
    monkeypatch.setattr(svc, "get_active_model", None, raising=False)
    with pytest.raises(RuntimeError, match="Model registry not available"):
        svc.analyze_text_blob("A: x")

def test_require_model_raises_when_no_active_model(monkeypatch):
    monkeypatch.setattr(svc, "get_active_model", lambda: None, raising=False)
    with pytest.raises(RuntimeError, match="No active model configured"):
        svc.analyze_text_blob("A: x")
