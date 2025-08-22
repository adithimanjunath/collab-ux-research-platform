# services/ux_report_service.py
from __future__ import annotations
from typing import List, Dict, Any
import io, re
from models.registry import get_active_model


try:
    from models.registry import get_active_model  # your existing local pipeline
except Exception:
    get_active_model = None  # type: ignore
# optional deps (safe imports)
try:
    import pdfplumber
except Exception:
    pdfplumber = None  # type: ignore
try:
    import PyPDF2
except Exception:
    PyPDF2 = None  # type: ignore
try:
    from docx import Document
except Exception:
    Document = None  # type: ignore

# ---------- NEW: answer-only regex (multiline) ----------
ANSWER_LINE_RE = re.compile(r"(?m)^\s*A:\s*(.+)\s*$")

def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def _answers_only_from_text(text: str) -> List[str]:
    """Return ONLY answers: lines that start with 'A:'"""
    if not text:
        return []

    items = [_norm(m.group(1)) for m in ANSWER_LINE_RE.finditer(text)]

    if not items:
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(“\"'])", text.strip())
        if len(sentences) < 2:
            sentences = [ln.strip() for ln in text.splitlines()]
        items = [_norm(s) for s in sentences if s.strip()]


    # dedupe (keep order) + drop empties
    seen, out = set(), []
    for s in items:
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out[:500]

# ---------- your existing extractors (unchanged except minor guards) ----------
def _extract_text_from_pdf_bytes(data: bytes) -> str:
    if pdfplumber is not None:
        try:
            chunks = []
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                for p in pdf.pages:
                    chunks.append(p.extract_text() or "")
            return "\n".join(chunks).strip()
        except Exception:
            pass
    if PyPDF2 is not None:
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(data))
            pages = []
            for p in reader.pages:
                try:
                    pages.append(p.extract_text() or "")
                except Exception:
                    pages.append("")
            return "\n".join(pages).strip()
        except Exception:
            pass
    raise RuntimeError("Unable to extract text from PDF.")

def _extract_text_from_docx_bytes(data: bytes) -> str:
    if Document is None:
        raise RuntimeError("python-docx not installed.")
    doc = Document(io.BytesIO(data))
    # join paragraphs with newlines so ANSWER_LINE_RE can see line starts
    return "\n".join(p.text for p in doc.paragraphs).strip()

def _decode_bytes(data: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return ""

def _extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _extract_text_from_pdf_bytes(file_bytes)
    if name.endswith(".docx"):
        return _extract_text_from_docx_bytes(file_bytes)
    if name.endswith(".txt"):
        return _decode_bytes(file_bytes)
    # heuristic fallback
    try:
        return _extract_text_from_pdf_bytes(file_bytes)
    except Exception:
        return _decode_bytes(file_bytes)

# ---------- public functions (unchanged signatures) ----------
def analyze_text_blob(text: str) -> Dict[str, Any]:
    items = _answers_only_from_text(text or "")
    model = get_active_model()
    return model.analyze_feedback_items(items)

def analyze_uploaded_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    text = _extract_text_from_bytes(file_bytes, filename)
    items = _answers_only_from_text(text)
    model = get_active_model()
    return model.analyze_feedback_items(items)
