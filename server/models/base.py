from typing import List, Dict, Any, Protocol

CATEGORIES = ["Usability","Performance","Visual Design","Feedback","Navigation","Responsiveness"]

# Canonical response your UI expects
UXReport = Dict[str, Any]

class UXModel(Protocol):
    name: str
    def analyze_feedback_items(self, feedback_list: List[str]) -> UXReport: ...
