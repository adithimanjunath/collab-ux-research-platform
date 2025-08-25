# server/service/analyze.py
from __future__ import annotations
from pathlib import Path
from typing import Iterable, Optional, Dict, Any, List

from .registry import get_active_model
from .preprocess import get_feedback_list

UXReport = Dict[str, Any]


def analyze_inputs(
    pdf_paths: Optional[Iterable[Path]] = None,
    text_inputs: Optional[Iterable[str]] = None,
) -> UXReport:
    """
    High-level API used by your web layer:
      1) harvest feedback items from PDFs and/or text
      2) run the active UX model
      3) return a canonical UXReport
    """
    feedback: List[str] = get_feedback_list(pdf_paths=pdf_paths, text_inputs=text_inputs)
    model = get_active_model()
    return model.analyze_feedback_items(feedback)
