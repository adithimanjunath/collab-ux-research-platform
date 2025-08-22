from typing import List, Dict, Any
from .base import UXModel, CATEGORIES

class DummyModel(UXModel):
    name = "dummy"

    def analyze_feedback_items(self, feedback_list: List[str]) -> Dict[str, Any]:
        return {
            "top_insight": "No strong themes detected.",
            "pie_data": [],
            "insights": {},
            "positive_highlights": [],
            "delight_distribution": [{"name": c, "value": 0} for c in CATEGORIES],
        }
