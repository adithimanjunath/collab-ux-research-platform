import os
import requests

# Hugging Face Space URL (set this in Render env as SPACE_URL=https://<your-space>.hf.space)
SPACE_URL = os.getenv("SPACE_URL", "").rstrip("/")

if not SPACE_URL:
    raise RuntimeError("SPACE_URL environment variable is not set! Example: https://username-spacename.hf.space")

# ---------- Zero-shot (single text) ----------
def zsc_single(
    text: str,
    labels: list[str],
    *,
    multi_label: bool = True,
    hypothesis_template: str = "This text is about {}.",
):
    """Call your Space /predict endpoint for zero-shot classification."""
    r = requests.post(
        f"{SPACE_URL}/predict",
        json={
            "text": text,
            "labels": labels,
            "multi_label": multi_label,
            "template": hypothesis_template,
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


# ---------- Sentiment (single text) ----------
def sa_single(text: str):
    """Call your Space /sa endpoint for sentiment analysis."""
    r = requests.post(f"{SPACE_URL}/sa", json={"text": text}, timeout=30)
    r.raise_for_status()
    return r.json()


# ---------- Summarization (single text) ----------
def sum_single(
    text: str,
    *,
    max_length: int = 60,
    min_length: int = 20,
    do_sample: bool = False,
):
    """Call your Space /sum endpoint for summarization."""
    r = requests.post(
        f"{SPACE_URL}/sum",
        json={
            "text": text,
            "max_length": max_length,
            "min_length": min_length,
            "do_sample": do_sample,
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()
