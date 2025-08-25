# services/hf_client.py
import os
import time
import requests

# Read the token from env (Render > Environment)
HF_HEADERS = {"Authorization": f"Bearer {os.getenv('HF_API_KEY', '')}"}

def _post(model: str, payload: dict):
    """
    Calls the Hugging Face Serverless Inference API for a given model.
    Handles first-call cold start (503 with estimated_time).
    """
    url = f"https://api-inference.huggingface.co/models/{model}"
    r = requests.post(url, headers=HF_HEADERS, json=payload, timeout=60)

    # Cold start → wait once and retry
    if r.status_code == 503:
        try:
            if r.headers.get("content-type", "").startswith("application/json"):
                wait = float(r.json().get("estimated_time", 8.0))
                time.sleep(min(30.0, wait))
                r = requests.post(url, headers=HF_HEADERS, json=payload, timeout=60)
        except Exception:
            pass

    r.raise_for_status()
    return r.json()

# ---------- Zero-shot (single text) ----------
def zsc_single(
    text: str,
    labels: list[str],
    *,
    multi_label: bool = True,
    hypothesis_template: str = "This text is about {}.",
    model: str | None = None,
):
    model = model or os.getenv(
        "HF_ZSC_MODEL",
        "MoritzLaurer/deberta-v3-large-zeroshot-v2.0-c",
    )
    return _post(
        model,
        {
            "inputs": text,
            "parameters": {
                "candidate_labels": labels,
                "multi_label": multi_label,
                "hypothesis_template": hypothesis_template,
            },
            "options": {"wait_for_model": True},
        },
    )

# ---------- Sentiment (single text) ----------
def sa_single(text: str, model: str | None = None):
    model = model or os.getenv(
        "HF_SA_MODEL",
        "distilbert-base-uncased-finetuned-sst-2-english",
    )
    out = _post(model, {"inputs": text, "options": {"wait_for_model": True}})
    # Normalize shapes that the API may return to: {"label": "...", "score": float}
    if isinstance(out, list):
        # some backends return [[{label,score}]] or [{label,score}]
        first = out[0] if out else {}
        if isinstance(first, list):
            first = first[0] if first else {}
        if isinstance(first, dict):
            return {"label": first.get("label", ""), "score": float(first.get("score", 0.0))}
    if isinstance(out, dict):
        return {"label": out.get("label", ""), "score": float(out.get("score", 0.0))}
    return {"label": "", "score": 0.0}

# ---------- Summarization (single text) ----------
def sum_single(
    text: str,
    *,
    max_length: int = 60,
    min_length: int = 20,
    do_sample: bool = False,
    model: str | None = None,
):
    model = model or os.getenv("HF_SUM_MODEL", "t5-small")
    out = _post(
        model,
        {
            "inputs": text,
            "parameters": {
                "max_length": max_length,
                "min_length": min_length,
                "do_sample": do_sample,
            },
            "options": {"wait_for_model": True},
        },
    )
    # Match transformers pipeline shape: list[{"summary_text": "..."}]
    return out if isinstance(out, list) else [out]