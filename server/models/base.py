from typing import List, Dict, Any, Protocol
import re

CATEGORIES = ["Usability","Performance","Visual Design","Feedback","Navigation","Responsiveness"]
PREF_ORDER = ["Performance","Responsiveness","Navigation","Usability","Visual Design","Feedback"]
PREF_RANK = {lab: i for i, lab in enumerate(PREF_ORDER)}

# --- Centralized, regex-based hints for each category ---
# base.py (suggested refinements)
CATEGORY_HINTS = {
    "Usability": re.compile(r"\b(confus\w+|unclear|intuiti\w*|label|affordance|learn|understand)\b", re.I),
    "Navigation": re.compile(
        r"\b(navigat\w+|menu|menus|breadcrumbs?|back\s*button|go\s*back|tab(s)?\b|sidebar|drawer|"
        r"hierarch\w+|find|wayfind\w+|structure|sitemap|path)\b",
        re.I
    ),
    "Performance": re.compile(
        r"\b(slow|lag(gy)?|latency|freeze\w*|hang\w*|timeout|load(?:ing)?\s*time|waiting\s*time|"
        r"takes?\s+too\s+long|sluggish|crash\w*|memory\s+leak|buffer(ing)?)\b",
        re.I
    ),
    "Responsiveness": re.compile(
        r"\b(unresponsive|input\s*delay|click\s*delay|tap\s*delay|stutter(ing)?|jank|"
        r"debounc\w*|double\s*click\s*needed|button\s*not\s*respond\w*|laggy\s*scroll)\b",
        re.I
    ),
    "Visual Design": re.compile(
        r"\b(color|contrast|typograph\w+|spacing|layout|visual|aesthetic|alignment|"
        r"breakpoint|mobile|tablet|phone|screen\s*size|resize|viewport|layout\s*(?:breaks?|broken)|overlap\w*)\b",
        re.I
    ),
    "Feedback": re.compile(r"\b(feedback|help|support|contact|report\s*issue|suggestion|error\s*message|opinion|kudos)\b", re.I),
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
