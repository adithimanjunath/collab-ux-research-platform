#!/usr/bin/env bash
set -euo pipefail

python - <<'PY'
from transformers import pipeline
pipeline("zero-shot-classification", model="MoritzLaurer/deberta-v3-large-zeroshot-v1")
pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
pipeline("summarization", model="t5-small")
print("Pipelines initialized.")
PY

exec gunicorn -k gthread -w 1 --threads 4 --timeout 180 -b 0.0.0.0:5050 app:app
