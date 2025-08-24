from typing import List, Dict, Any, Protocol
import re

CATEGORIES = ["Usability","Performance","Visual Design","Feedback","Navigation","Responsiveness"]
PREF_ORDER = ["Performance","Responsiveness","Navigation","Usability","Visual Design","Feedback"]
PREF_RANK = {lab: i for i, lab in enumerate(PREF_ORDER)}

# --- Centralized, regex-based hints for each category ---
CATEGORY_HINTS = {
    "Usability": re.compile(r"\b(confus\w+|unclear|intuiti\w*|label|affordance|learn|understand)\b", re.I),
    "Navigation": re.compile(r"\b(navigat\w+|menu|breadcrumbs?|search bar|find|wayfind\w+|structure)\b", re.I),
    "Performance": re.compile(r"\b(slow|lag|latency|freeze\w*|hang\w*|timeout|load(?:ing)?\s*time|waiting\s*time|delay(ed)?|takes?\s+too\s+long|sluggish|spinner|spinning)\b", re.I),
    "Responsiveness": re.compile(r"\b(responsive|breakpoint|mobile|tablet|phone|screen\s*size|resize|viewport|layout\s*(?:breaks?|broken)|overlap\w*|unresponsive)\b", re.I),
    "Visual Design": re.compile(r"\b(color|contrast|typograph\w+|spacing|layout|visual|aesthetic|alignment)\b", re.I),
    "Feedback": re.compile(r"\b(feedback|help|support|contact|report issue|suggestion|error message)\b", re.I),
}

def passes_category_gate(label: str, text: str) -> bool:
    """Lightweight rule to prevent obviously-wrong labels."""
    hint = CATEGORY_HINTS.get(label)
    return True if hint is None else bool(hint.search(text))

def sort_categories(labels):
    """Stable sort by preference; unknown labels go last."""
    return sorted(labels, key=lambda c: PREF_RANK.get(c, 1_000))

# Canonical response your UI expects
UXReport = Dict[str, Any]

class UXModel(Protocol):
    name: str
    def analyze_feedback_items(self, feedback_list: List[str]) -> UXReport: ...
