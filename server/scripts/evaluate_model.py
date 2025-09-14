from __future__ import annotations

import argparse, csv, os,re
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

# Canonical labels (must match your taxonomy)
CANON_LABELS = ["Usability","Performance","Visual Design","Feedback","Navigation","Responsiveness"]

# Descriptive candidates (work better for zero-shot)
CANDIDATE_MAP = {
    "Usability":      "Usability issues (confusing UX, hard to use, form friction, task flow confusion, input errors, discoverability)",
    "Performance":    "Performance problems (slow overall, laggy scrolling, crashes, memory, battery drain, layout shift/CLS)",
    "Visual Design":  "Visual design feedback (colors, typography, spacing, contrast, alignment, icon style, visual aesthetics)",
    "Navigation":     "Navigation & information architecture (menus, wayfinding, breadcrumbs, findability, back-button behavior, routing, deep linking)",
    "Responsiveness": "Responsiveness & input delay (slow reaction to taps/clicks, delayed transitions, jank, UI feels unresponsive)",
    "Feedback":       "General feedback or opinions not tied to a specific UX issue (praise, pricing notes, broad sentiment, non-actionable comments)",
}
CANDIDATES = list(CANDIDATE_MAP.values())
REV_MAP = {desc: canon for canon, desc in CANDIDATE_MAP.items()}

TEMPLATE = "This feedback is primarily about {}."
# --- small, conservative post-hoc nudges (evaluator-side only) ---
CLASS_PRIOR = {
    "Usability": 1.12,
    "Performance": 1.20,
    "Visual Design": 1.00,
    "Navigation": 1.20,
    "Responsiveness": 0.90,
    "Feedback": 0.80,  # slight downweight so it doesn't steal borderline cases
}

KW = {
    "Navigation": [
        "navigation","breadcrumb","breadcrumbs","back button","menu","submenu","drawer",
        "sidebar","findability","routing","sitemap","pagination","hierarchy","path",
        "return","go back","came from","where i am","lost","breadcrumbs would help",
        "takes me somewhere else","search results page"
    ],
    "Usability": [
        "confusing","hard to use","not obvious","intuitive","form","validation","tooltip",
        "discoverable","tap target","onboarding","input field","error message","learnability", "keyboard",
          "modifier", "shortcut", "focus", "tab key"
    ],
    "Performance": [
        "slow","lag","crash","crashes","latency","buffering","load time","loading","wait",
        "waiting","cold start","startup time","memory","battery","timeout","layout shift","cls",
        "takes","seconds","appear","search results take"
    ],
    "Responsiveness": [
        "delay","unresponsive","jank","slow to react","keypress delay","input lag",
        "scroll stutter","tap delay","click delay","typing delay","freeze","stutter"
    ],
    "Visual Design": ["contrast","color","typography","spacing","whitespace","alignment","grid","icons","shadow","brand"],
    "Feedback": ["feedback","opinion","kudos","thanks","praise"],
}

FEEDBACK_DEMOTE_MARGIN = 0.12  # if Feedback top but within 5% of #2 and #2 has keyword hits, pick #2

def _kw_bonus(label: str, text: str) -> float:
    t = (text or "").lower()
    hits = sum(1 for w in KW.get(label, []) if w in t)
    # tiny, capped bonus
    step, cap = 0.07, 0.22
    return min(cap, hits * step)

_LATENCY_RE = re.compile(r"\b(take[s]?|takes|took)\s+\d+\s*(sec|secs|second|seconds)\b", re.I)
def _perf_latency_bonus(text: str) -> float:
    return 0.06 if _LATENCY_RE.search(text or "") else 0.0
# ---- CSV loading -------------------------------------------------------------
TEXT_HEADER_CANDIDATES = ["text","feedback","comment","review","utterance","message"]
LABEL_HEADER_CANDIDATES = ["label","category","class","topic"]

def _detect_headers(headers: List[str]) -> Tuple[Optional[str], Optional[str]]:
    text_col = next((h for h in headers if h.strip().lower() in TEXT_HEADER_CANDIDATES), None)
    label_col = next((h for h in headers if h.strip().lower() in LABEL_HEADER_CANDIDATES), None)
    return text_col, label_col

def read_labeled_csv(path: str, limit: Optional[int] = None) -> Tuple[List[str], List[str], Dict[str, Any]]:
    texts, labels = [], []
    with open(path, "r", newline="", encoding="utf-8-sig") as f:
        rd = csv.DictReader(f)
        headers = rd.fieldnames or []
        text_col, label_col = _detect_headers(headers)
        info = {"text": text_col, "label": label_col, "all_headers": headers}
        if not text_col or not label_col:
            raise RuntimeError(f"Could not detect text/label columns. Headers present: {headers}")
        for row in rd:
            if limit is not None and len(texts) >= limit:
                break
            t = (row.get(text_col) or "").strip()
            y = (row.get(label_col) or "").strip()
            if not t or not y:
                continue
            texts.append(t)
            labels.append(y)
    return texts, labels, info

# ---- Prediction via your HF Space -------------------------------------------
def predict_per_item_direct(texts: List[str]) -> List[str]:
    try:
        from services.hf_client import zsc_single
    except Exception as e:
        raise RuntimeError("hf-direct requires server/services/hf_client.py and SPACE_URL to be set.") from e

    max_workers = int(os.getenv("HF_CONCURRENCY", "4"))
    from concurrent.futures import ThreadPoolExecutor, as_completed

    preds: List[Optional[str]] = [None] * len(texts)
    done, report_every = 0, max(1, len(texts)//12)

    def one(i: int, t: str)-> tuple[int, str]:
        out = zsc_single(t, CANDIDATES, multi_label=False, hypothesis_template=TEMPLATE)

        if i < 3:  # only first 3 rows for sanity
            print(f"DBG raw #{i}: {out}", flush=True)

        labels = list(out.get("labels") or [])
        scores = list(out.get("scores") or [])
        if not (labels and scores):
            return i, "Feedback"
        
        agg = {lab: 0.0 for lab in CANON_LABELS}
        for l, s in zip(labels, scores):
            canon = REV_MAP.get(l, l if l in CANON_LABELS else "Feedback")
            agg[canon] += float(s)

        for lab in agg:
            agg[lab] = agg[lab] * CLASS_PRIOR.get(lab, 1.0) + _kw_bonus(lab, t)
            agg["Performance"] += _perf_latency_bonus(t)

        pairs = sorted(agg.items(), key=lambda p: p[1], reverse=True)
        top_lab, top_sc = pairs[0]
        if top_lab == "Feedback" and len(pairs) > 1:
            second_lab, second_sc = pairs[1]
            if (top_sc - second_sc) < FEEDBACK_DEMOTE_MARGIN and _kw_bonus(second_lab, t) > 0:
                return i, second_lab
        return i, top_lab

    print(f"submitted {len(texts)} items (concurrency={max_workers}); waiting for first result…", flush=True)
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = [ex.submit(one, i, t) for i, t in enumerate(texts)]
        for fut in as_completed(futs):
            i, y = fut.result()
            preds[i] = y or "Feedback"
            done += 1
            if done % report_every == 0 or done == len(texts):
                print(f"progress: {done}/{len(texts)} complete", flush=True)

    return [p or "Feedback" for p in preds]

# ---- CLI + evaluation --------------------------------------------------------
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Evaluate zero-shot UX categorization via your HF Space (hf-direct).")
    p.add_argument("--data", required=True, help="Path to CSV with text + label columns.")
    p.add_argument("--model", default="hf-direct", choices=["hf-direct"])
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--debug", action="store_true")
    return p.parse_args()

def main():
    args = parse_args()
    texts, golds_raw, info = read_labeled_csv(args.data, limit=args.limit)
    print(f"Detected columns: {info}")
    print(f"Parsed rows: {len(texts)}")

    golds = [g.strip() for g in golds_raw]
    print("Gold label distribution:", Counter(golds))

    preds = predict_per_item_direct(texts)

    if args.debug:
        print("\nDEBUG: first 5 preds vs golds")
        for i, (g, p, t) in enumerate(zip(golds, preds, texts)):
            print(f"{i:02d}. pred={p:<15} gold={g:<15} | {t[:120]}")
            if i >= 4: break

    print(f"Samples: {len(texts)}")
    print(f"Accuracy: {accuracy_score(golds, preds):.3f}\n")
    print(f"Macro-F1: {f1_score(golds, preds, average='macro', labels=CANON_LABELS, zero_division=0):.3f}\n")

    print("Per-class report:")
    print(classification_report(golds, preds, labels=CANON_LABELS, target_names=CANON_LABELS, zero_division=0, digits=2))

    print("\nConfusion Matrix (rows=gold, cols=pred)")
    print(f"Labels: {CANON_LABELS}")
    for row in confusion_matrix(golds, preds, labels=CANON_LABELS):
        print(list(map(int, row)))

    mistakes = [(g, p, t) for g, p, t in zip(golds, preds, texts) if g != p]
    if mistakes:
        print("\nSome mistakes:")
        for g, p, t in mistakes[:5]:
            print(f"- gold={g:<15} | pred={p:<15} | {t}")
    else:
        print("\nNo mistakes on this subset.")

if __name__ == "__main__":
    main()