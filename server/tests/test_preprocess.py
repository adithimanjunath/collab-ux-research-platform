import pytest
from services.ux_report_service import _answers_only_from_text as answers_only  # noqa

def test_answers_only_extracts_A_lines_and_dedupes():
    text = """
    Q: x
    A: Fast loading.
    A: Fast loading.
    A: Search accurate.
    """
    out = answers_only(text)
    assert out == ["Fast loading.", "Search accurate."]

def test_answers_only_fallback_to_sentences():
    text = "Great performance! Dark mode is nice. But checkout is slow..."
    out = answers_only(text)
    assert "Great performance!" in out and "Dark mode is nice." in out