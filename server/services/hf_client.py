# server/services/hf_client.py
from __future__ import annotations
import os
import time
import json
import requests
from typing import Any, Dict, List

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
SPACE_URL = (os.getenv("SPACE_URL") or "").rstrip("/")
if not SPACE_URL:
    raise RuntimeError(
        "SPACE_URL environment variable is not set. Example: "
        "SPACE_URL=https://username-spacename.hf.space"
    )

# If you later make the Space private, put a token in HF_API_KEY.
# We'll automatically attach the Bearer header if present.
_HF_TOKEN = os.getenv("HF_API_KEY", "").strip()
_HEADERS = {"Content-Type": "application/json"}
if _HF_TOKEN:
    _HEADERS["Authorization"] = f"Bearer {_HF_TOKEN}"

# Default per-call timeouts (seconds)
_DEFAULT_TIMEOUT = 60


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def _post_json(path: str, payload: Dict[str, Any], *, timeout: int = _DEFAULT_TIMEOUT) -> Dict[str, Any] | List[Any]:
    """
    POST JSON to your Space endpoint. Handles cold starts (503 with estimated_time)
    by sleeping once and retrying.
    """
    url = f"{SPACE_URL}{path}"
    try:
        r = requests.post(url, headers=_HEADERS, json=payload, timeout=timeout)
    except requests.RequestException as e:
        raise RuntimeError(f"Hugging Face Space request failed to {url}: {e}") from e

    # Cold start handling (some Spaces return 503 w/ estimated_time)
    if r.status_code == 503:
        try:
            if r.headers.get("content-type", "").startswith("application/json"):
                est = float(r.json().get("estimated_time", 8.0))
                time.sleep(min(30.0, max(0.0, est)))
                r = requests.post(url, headers=_HEADERS, json=payload, timeout=timeout)
        except Exception:
            pass

    # Raise for other HTTP errors
    try:
        r.raise_for_status()
    except requests.HTTPError as e:
        # Bubble up a helpful error with body included
        body = r.text[:500]
        raise RuntimeError(f"Space call to {url} failed: {r.status_code} {body}") from e

    # Return parsed JSON (object or list)
    try:
        return r.json()
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Non-JSON response from {url}: {r.text[:200]}") from e


def _norm_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


# ---------------------------------------------------------------------
# Public API (shapes match your pipelines)
# ---------------------------------------------------------------------
def zsc_single(
    text: str,
    labels: List[str],
    *,
    multi_label: bool = True,
    hypothesis_template: str = "This text is about {}.",
) -> Dict[str, Any]:
    """
    Call your Space zero‑shot endpoint. Must return:
      {"labels": [...], "scores": [...]}
    """
    raw = _post_json(
        "/predict",
        {
            "text": text,
            "labels": labels,
            "multi_label": multi_label,
            "template": hypothesis_template,
        },
        timeout=_DEFAULT_TIMEOUT,
    )

    # Normalize a few common shapes
    # Expected: {"labels":[...], "scores":[...]}
    if isinstance(raw, dict):
        out_labels = raw.get("labels") or raw.get("candidate_labels") or []
        out_scores = raw.get("scores") or raw.get("probabilities") or []
        return {
            "labels": list(map(str, out_labels)),
            "scores": [ _norm_float(s) for s in out_scores ],
        }

    # Some Spaces return a list with one dict
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        d = raw[0]
        out_labels = d.get("labels") or d.get("candidate_labels") or []
        out_scores = d.get("scores") or d.get("probabilities") or []
        return {
            "labels": list(map(str, out_labels)),
            "scores": [ _norm_float(s) for s in out_scores ],
        }

    # Fallback empty
    return {"labels": [], "scores": []}


def sa_single(text: str) -> Dict[str, Any]:
    """
    Call your Space sentiment endpoint. Must return:
      {"label": "...", "score": float}
    """
    raw = _post_json("/sa", {"text": text}, timeout=30)

    # Common variants to normalize:
    # {"label":"POSITIVE","score":0.98}
    # [{"label":"POSITIVE","score":0.98}]
    # {"results":[{"label":"POSITIVE","score":0.98}]}
    if isinstance(raw, dict):
        if "label" in raw and "score" in raw:
            return {"label": str(raw["label"]), "score": _norm_float(raw["score"])}
        if "results" in raw and isinstance(raw["results"], list) and raw["results"]:
            first = raw["results"][0]
            if isinstance(first, dict):
                return {"label": str(first.get("label", "")), "score": _norm_float(first.get("score", 0.0))}

    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        first = raw[0]
        return {"label": str(first.get("label", "")), "score": _norm_float(first.get("score", 0.0))}

    return {"label": "", "score": 0.0}


def sum_single(
    text: str,
    *,
    max_length: int = 60,
    min_length: int = 20,
    do_sample: bool = False,
) -> List[Dict[str, Any]]:
    """
    Call your Space summarization endpoint. Must return list of:
      [{"summary_text": "..."}]
    """
    raw = _post_json(
        "/sum",
        {
            "text": text,
            "max_length": max_length,
            "min_length": min_length,
            "do_sample": do_sample,
        },
        timeout=_DEFAULT_TIMEOUT,
    )

    # Normalize common variants to transformers-like shape
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        if "summary_text" in raw[0]:
            return [{"summary_text": str(d.get("summary_text", ""))} for d in raw]
        if "summary" in raw[0]:
            return [{"summary_text": str(d.get("summary", ""))} for d in raw]

    if isinstance(raw, dict):
        if "summary_text" in raw:
            return [{"summary_text": str(raw.get("summary_text", ""))}]
        if "summary" in raw:
            return [{"summary_text": str(raw.get("summary", ""))}]

    # Fallback minimal
    return [{"summary_text": str(raw) if not isinstance(raw, (dict, list)) else ""}]


# ---------------------------------------------------------------------
# Optional health check (handy for startup or readiness probes)
# ---------------------------------------------------------------------
def health() -> Dict[str, Any]:
    """
    Try a lightweight GET / or /healthz if you exposed one in your Space.
    Safe to ignore errors; returns a small dict.
    """
    for path in ("/healthz", "/"):
        try:
            r = requests.get(f"{SPACE_URL}{path}", headers=_HEADERS, timeout=5)
            return {"ok": r.ok, "status": r.status_code}
        except Exception:
            continue
    return {"ok": False, "status": None}


__all__ = ["zsc_single", "sa_single", "sum_single", "health"]
