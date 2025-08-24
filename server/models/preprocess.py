# server/preprocess.py
from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple
import io
import re

try:
    import PyPDF2  # type: ignore
except Exception:  # library optional at import time
    PyPDF2 = None  # noqa: N816

# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

# default pattern: capture multi-line A: blocks until the next Q:/A: or EOF
DEFAULT_ANSWER_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"(?ms)^A:\s*(.+?)(?=\nQ:|\Z)"),
    re.compile(r"(?ms)^(?:Answer|Ans)\s*:\s*(.+?)(?=\nQ:|\Z)", re.IGNORECASE),
)



# minimal trimming / normalization for extracted feedback items
def _clean(s: str) -> str:
    if not s:
        return ""
    # unify line endings early
    s = s.replace("\r\n", "\n").replace("\r", "\n")

    # join hyphenated line breaks: "dash-\nboard" -> "dashboard"
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", s)

    # turn remaining newlines into spaces
    s = s.replace("\n", " ")

    # collapse repeated whitespace
    s = re.sub(r"\s+", " ", s)

    # tidy quotes/spaces
    return s.strip(" \t\"“”'’")

# -------------------------------------------------------------------
# PDF extraction
# -------------------------------------------------------------------

def _extract_text_from_pdf_bytes(data: bytes) -> str:
    if PyPDF2 is None:
        raise RuntimeError(
            "PyPDF2 is not installed. Add `PyPDF2` to requirements and reinstall."
        )
    reader = PyPDF2.PdfReader(io.BytesIO(data))
    texts: List[str] = []
    for page in reader.pages:
        try:
            t = page.extract_text() or ""
        except Exception:
            t = ""
        if t:
            texts.append(t)
    return "\n".join(texts)


def extract_answers_from_pdf_file(pdf_path: Path,
                                  patterns: Sequence[re.Pattern[str]] = DEFAULT_ANSWER_PATTERNS
                                  ) -> List[str]:
    """
    Read a PDF file and extract candidate answers/feedback using regex patterns.
    """
    if not pdf_path.exists():
        return []
    data = pdf_path.read_bytes()
    raw_text = _extract_text_from_pdf_bytes(data)
    return extract_answers_from_text(raw_text, patterns)


# -------------------------------------------------------------------
# Plain text extraction
# -------------------------------------------------------------------

def extract_answers_from_text(text: str, patterns: Sequence[re.Pattern[str]] = DEFAULT_ANSWER_PATTERNS) -> List[str]:
    """
    Extract answers (feedback items) from a text blob using one or more regex patterns.
    Returns a de-duplicated, cleaned list.
    """
    if not text:
        return []
    found: List[str] = []
    for rx in patterns:
        for m in rx.finditer(text):
            ans = _clean(m.group(1))
            if ans:
                found.append(ans)

    # fallback: if nothing matched, consider each nonempty sentence/line a feedback item
    if not found:
        # prefer sentence splits; fall back to line breaks
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(“\"'])", text.strip())
        if len(sentences) < 2:
            sentences = [ln.strip() for ln in text.splitlines()]

        for s in sentences:
            s = _clean(s)
            if s:
                found.append(s)

    # If there is a closing "overall" sentence without "A:", include it
    overall_rx = re.compile(r"(?mi)^\s*(?:But\s+overall|Overall|On the positive side)\s*[:,]\s*(.+?)\s*$")
    for m in overall_rx.finditer(text):
        ans = _clean(m.group(1))
        if ans:
            found.append(ans)

    # minimal de-duplication preserving order
    seen = set()
    deduped: List[str] = []
    for s in found:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            deduped.append(s)
    return deduped


# -------------------------------------------------------------------
# Public facade
# -------------------------------------------------------------------

def get_feedback_list(
    pdf_paths: Optional[Iterable[Path]] = None,
    text_inputs: Optional[Iterable[str]] = None,
    patterns: Sequence[re.Pattern[str]] = DEFAULT_ANSWER_PATTERNS,
) -> List[str]:
    """
    Aggregate feedback items from multiple PDFs and/or raw text blobs.

    Args:
        pdf_paths: iterable of filesystem Paths to PDF files (optional)
        text_inputs: iterable of raw text blobs (optional)
        patterns: regex patterns that capture the answer body
    """
    feedback: List[str] = []

    if pdf_paths:
        for p in pdf_paths:
            feedback.extend(extract_answers_from_pdf_file(Path(p), patterns))

    if text_inputs:
        for t in text_inputs:
            feedback.extend(extract_answers_from_text(t, patterns))

    # final de-duplication
    seen = set()
    out: List[str] = []
    for s in feedback:
        key = s.lower()
        if key not in seen and s:
            seen.add(key)
            out.append(s)
    return out
