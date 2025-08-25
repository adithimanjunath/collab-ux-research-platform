# server/models/registry.py
from __future__ import annotations
import os
from functools import lru_cache
from .base import UXModel  # keep base types only

@lru_cache(maxsize=1)
def get_active_model() -> UXModel:
    """
    Select the active UX model implementation based on env:
      UX_MODEL=dummy  -> DummyModel (no ML)
      UX_MODEL=local  -> HFZeroShotModel (local pipelines; requires transformers)
      UX_MODEL=hf     -> HFZeroShotModel (remote via SPACE_URL / serverless; no transformers import)
    """
    mode = (os.getenv("UX_MODEL") or "hf").lower()

    if mode in {"none", "off", "dummy"}:
        from .dummy import DummyModel     # lazy import
        return DummyModel()

    if mode == "local":
        # Local pipelines: allow hf_zero_shot to import transformers
        os.environ.setdefault("USE_LOCAL_MODELS", "1")
        from .hf_zero_shot import HFZeroShotModel  # lazy import
        return HFZeroShotModel()

    # Default: remote (Space / Serverless) — do NOT import transformers
    os.environ.setdefault("USE_LOCAL_MODELS", "0")
    from .hf_zero_shot import HFZeroShotModel      # lazy import (module must avoid transformers in remote mode)
    return HFZeroShotModel()
