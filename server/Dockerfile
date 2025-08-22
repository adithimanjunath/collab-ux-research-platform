FROM python:3.10-slim


ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/hf-cache \
    TRANSFORMERS_CACHE=/opt/hf-cache \
    PIP_NO_CACHE_DIR=1


WORKDIR /app
# System deps for tokenizers, pdf libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
 && python -m pip install --index-url https://download.pytorch.org/whl/cpu torch==2.7.1+cpu \
 && python -m pip install -r requirements.txt

COPY . .

RUN python - <<'PY'
from transformers import pipeline
pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-3")
pipeline("sentiment-analysis",      model="distilbert-base-uncased-finetuned-sst-2-english")
pipeline("summarization",           model="t5-small")
print("Models cached.")
PY
EXPOSE 5050
CMD ["gunicorn", "-k", "eventlet", "-w", "2" ,"--timeout","180", "-b", "0.0.0.0:5050" , "app:app"]