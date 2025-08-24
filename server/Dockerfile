FROM python:3.10-slim


ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/hf-cache \
    TRANSFORMERS_CACHE=/opt/hf-cache \
    PIP_NO_CACHE_DIR=1 \
    TOKENIZERS_PARALLELISM=false \
    OMP_NUM_THREADS=1 \
    HF_HUB_ENABLE_HF_TRANSFER=1

WORKDIR /app
# System deps for tokenizers, pdf libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Pin big packages to stable wheels; you already pin torch CPU wheel
# Use BuildKit cache for pip to avoid re-downloading between builds.
RUN --mount=type=cache,id=s/3c4a9e73-ad9b-495e-bfd9-f68b109aa1c2-pip-cache,target=/root/.cache/pip \
    python -m pip install --upgrade pip \
 && python -m pip install torch==2.3.1 torchvision==0.18.1 torchaudio==2.3.1 \
       --index-url https://download.pytorch.org/whl/cpu \
 && python -m pip install -r requirements.txt \
 && python -m pip install hf_transfer

# Use a cache mount for the HF cache too (again with an id=)
RUN  --mount=type=cache,id=s/3c4a9e73-ad9b-495e-bfd9-f68b109aa1c2-hf-cache,target=/opt/hf-cache \
    python - <<'PY'
from huggingface_hub import snapshot_download
# Pre-download the exact models you use in startup.sh
snapshot_download("MoritzLaurer/deberta-v3-large-zeroshot-v1", cache_dir="/opt/hf-cache", token=None)
snapshot_download("distilbert-base-uncased-finetuned-sst-2-english", cache_dir="/opt/hf-cache", token=None)
snapshot_download("t5-small", cache_dir="/opt/hf-cache", token=None)
print("HF models cached into /opt/hf-cache")
PY

# App code

COPY . .

# COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh
EXPOSE 5050
CMD ["/app/startup.sh"]
