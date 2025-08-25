# syntax=docker/dockerfile:1
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TOKENIZERS_PARALLELISM=false \
    OMP_NUM_THREADS=1

WORKDIR /app

# System deps you actually need (keep tiny)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc \
 && rm -rf /var/lib/apt/lists/*

# If your requirements no longer include torch/transformers, this will be fast
COPY requirements.txt .
RUN python -m pip install --upgrade pip \
 && python -m pip install -r requirements.txt

# App code
COPY . .

# No model warm-up (those live on HF Space now)
EXPOSE 5050

# Tune gunicorn threads/workers for I/O bound API
CMD ["gunicorn", "-k", "gthread", "-w", "1", "--threads", "4", "--timeout", "180", "-b", "0.0.0.0:5050", "app:app"]
