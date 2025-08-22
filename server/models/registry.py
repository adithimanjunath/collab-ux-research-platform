# server/models/registry.py
from __future__ import annotations
import os
from functools import lru_cache
from .base import UXModel
from .hf_zero_shot import HFZeroShotModel
from .dummy import DummyModel

_active: UXModel | None = None

@lru_cache(maxsize=1)
def get_active_model() -> UXModel:
    global _active
    if _active is not None:
        return _active

    model_key = (os.getenv("UX_MODEL") or "hf").lower()
    if model_key in ("none", "off", "dummy"):
        _active = DummyModel()
    else:
        _active = HFZeroShotModel()

    return _active
