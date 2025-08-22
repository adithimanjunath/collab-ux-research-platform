from typing import List, Dict, Any, cast, Iterable, Tuple
import re,os
from transformers.pipelines import pipeline
from .base import UXModel, CATEGORIES

try:
    import torch  # why: detect GPU and avoid needless CPU-only runs
    _HAS_TORCH = True
except Exception:
    _HAS_TORCH = False

def _pick_device() -> int:
    # why: pick GPU when available for large batches
    if _HAS_TORCH and torch.cuda.is_available():
        return 0
    return -1


class HFZeroShotModel(UXModel):
    name = "hf_zero_shot"
    _classifier = None
    _sentiment = None
    _summarizer = None

     # ---- Tunable thresholds (report these in thesis) ----
    CRITIQUE_NEG_PROB = 0.60          # gate: treat as critique if neg_prob ≥ 0.60
    ZSC_THRESHOLD = 0.50              # assign category if zero-shot score ≥ 0.50
    DELIGHT_TOP1_THRESHOLD = 0.50     # keep delight top-1 only if score ≥ 0.50
    DELIGHT_MAX_ITEMS = int(os.getenv("DELIGHT_MAX_ITEMS", "1000")) 

    # ---- Negation-aware patterns ----
    _SAFE_NEGATED_PROBLEMS_RE = re.compile(
        r'\b(?:no|without)\s+(?:major\s+)?(?:issues?|problems?|bugs?|errors?)\b',
        re.IGNORECASE,
    )
    _KEYWORD_PATTERNS: Tuple[re.Pattern[str], ...]= tuple(
        re.compile(rx, re.IGNORECASE)
        for rx in(
        r'\bshould\b',
        r'\bcould\b',
        r'\bneed(?:s)?\s+to\b',
        r'would be (?:better|great)',
        r'\bimprov\w+\b',
        r'\bdifficult\b',
        r'hard to',
        r'\black\b',
        r'\bslow\b',
        r'\bconfus\w+\b',   # confusing / confused
        r'\bunclear\b',
        r'\bnot\s+(?:good|intuitive|working|responsive)\b',
        )
    )
    
    _PROBLEM_TERMS: Tuple[re.Pattern[str], ...] = tuple(
        re.compile(r'\b' + rx + r'\b', re.IGNORECASE)
        for rx in (r'issues?', r'problems?', r'bugs?', r'errors?', r'crash(?:es|ed|ing)?'))
    
    _NEGATION_WINDOW_RE = re.compile(
        r'\b(?:no|not|without|never|hardly any|rarely any|no major|no significant)\b',
        re.IGNORECASE,
    )

    @classmethod
    def _get_pipes(cls):
        if cls._classifier is None:
            cls._classifier = pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-3", device = _pick_device(), truncation= True,)
        if cls._sentiment is None:
            cls._sentiment = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english", device = _pick_device(), truncation= True,)
        if cls._summarizer is None:
            cls._summarizer = pipeline("summarization", model="t5-small", device = _pick_device())
        return cls._classifier, cls._sentiment, cls._summarizer
    
    @staticmethod
    def _has_suggestion_keyword(text: str) -> bool:
        """Return True if text implies a critique/suggestion (negation-aware)."""
    # Already case-insensitive patterns; no need to lowercase the input.
        if HFZeroShotModel._SAFE_NEGATED_PROBLEMS_RE.search(text):
            return False

    # Keyword patterns (compiled)
        for rx in HFZeroShotModel._KEYWORD_PATTERNS:
            if rx.search(text):
                return True

    # Problem terms (compiled) only if not negated nearby
        for rx in HFZeroShotModel._PROBLEM_TERMS:
         for m in rx.finditer(text):                         # <— use the compiled pattern
            window = text[max(0, m.start() - 24): m.start()]
            if HFZeroShotModel._NEGATION_WINDOW_RE.search(window):
                continue
            return True

        return False

    
    @staticmethod
    def _strip_mixed_clause(feedback: str) -> str:
        """Keep the 'problem' clause in mixed praise/critique sentences."""
        lower = feedback.lower()
        # why: avoid splitting on unrelated 'but/however' in names/URLs
        # simple heuristic with spaces; cheap and usually effective
        for delim in (" but ", " however "):
            idx = lower.find(delim)
            if idx != -1:
                start = idx + len(delim)
                return feedback[start:].strip().lstrip(".,:;! ")
        if lower.startswith(("although", "though")) and "," in feedback:
            return feedback.split(",", 1)[1].strip().lstrip(".,:;! ")
        return feedback.strip()

    @staticmethod
    def _batch(iterable: List[str], size: int) -> Iterable[Tuple[int, List[str]]]:
        """Yield (start_index, chunk)."""
        n = len(iterable)
        for i in range(0, n, size):
            yield i, iterable[i:i + size]  

    def analyze_feedback_items(self, feedback_list: List[str]) -> Dict[str, Any]:
        classifier, sentiment_analyzer, summarizer = self._get_pipes()

        # --- filter empties early
        items: List[str] = [s for s in feedback_list if s and s.strip()]
        if not items:
            return {
                "top_insight": "No strong themes detected.",
                "pie_data": [],
                "insights": {},
                "positive_highlights": [],
                "delight_distribution": [{"name": c, "value": 0} for c in CATEGORIES],
            }

        # --- 1) Batch sentiment pass
        # HF pipelines support list input + batch_size
        sa_results: List[Dict[str, Any]] = []
        for _, chunk in self._batch(items, size=32):
            sa = cast(List[Dict[str, Any]], sentiment_analyzer(chunk, batch_size=32, truncation=True))
            sa_results.extend(sa)

        is_critique_mask: List[bool] = []
        for text, sa in zip(items, sa_results):
            label = str(sa.get("label", "")).upper()
            score = float(sa.get("score", 0.0))
            pos_prob = score if label == "POSITIVE" else (1.0 - score)
            neg_prob = 1.0 - pos_prob
            suggestive = self._has_suggestion_keyword(text)
            is_critique_mask.append((neg_prob >= self.CRITIQUE_NEG_PROB) or suggestive)

        # --- 2) Build critique set (with clause focusing)
        critiques: List[str] = []
        critique_indices: List[int] = []
        for idx, (text, is_crit) in enumerate(zip(items, is_critique_mask)):
            if is_crit:
                critiques.append(self._strip_mixed_clause(text))
                critique_indices.append(idx)

        # --- 3) Multi-label ZSC on critiques (batched)
        category_counts: Dict[str, int] = {cat: 0 for cat in CATEGORIES}
        category_feedbacks: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}

        if critiques:
            zsc_outputs: List[Dict[str, Any]] = []
            for _, chunk in self._batch(critiques, size=8):
                out = cast(
                    List[Dict[str, Any]],
                    classifier(
                        chunk,
                        candidate_labels=CATEGORIES,
                        multi_label=True,
                        batch_size=8,
                        truncation=True,
                    ),
                )
                zsc_outputs.extend(out)

            for crit_text, z in zip(critiques, zsc_outputs):
                labels = z.get("labels", []) or []
                scores = [float(s) for s in (z.get("scores", []) or [])]
                for lab, sc in zip(labels, scores):
                    if lab in category_counts and sc >= self.ZSC_THRESHOLD:
                        category_counts[lab] += 1
                        category_feedbacks[lab].append(crit_text)

        # --- 4) Delight: top-1 label on positives (batched, optional cap)
        positives: List[str] = [t for t, is_crit in zip(items, is_critique_mask) if not is_crit]
        positive_comments = positives[: self.DELIGHT_MAX_ITEMS]  # cap to protect worst-case N
        delight_counts: Dict[str, int] = {cat: 0 for cat in CATEGORIES}

        if positive_comments:
            zsc_pos_outputs: List[Dict[str, Any]] = []
            for _, chunk in self._batch(positive_comments, size=8):
                out = cast(
                    List[Dict[str, Any]],
                    classifier(
                        chunk,
                        candidate_labels=CATEGORIES,
                        multi_label=False,
                        batch_size=8,
                        truncation=True,
                    ),
                )
                zsc_pos_outputs.extend(out)

            for z in zsc_pos_outputs:
                best_label = z.get("labels", [""])[0]
                best_score = float((z.get("scores", [0.0]) or [0.0])[0])
                if best_label in delight_counts and best_score >= self.DELIGHT_TOP1_THRESHOLD:
                    delight_counts[best_label] += 1

        delight_distribution = [{"name": cat, "value": int(delight_counts[cat])} for cat in CATEGORIES]

        # --- 5) Summaries for categories with issues (unchanged logic)
        category_summaries: Dict[str, str] = {}
        for cat, texts in category_feedbacks.items():
            if not texts:
                continue
            combined = " ".join(texts)[:4000]
            try:
                s = cast(
                    List[Dict[str, Any]],
                    summarizer(combined, max_length=60, min_length=20, do_sample=False),
                )
                summary = str(s[0].get("summary_text", "")).strip()
                category_summaries[cat] = summary or "; ".join(texts[:6])
            except Exception:
                category_summaries[cat] = "; ".join(texts[:6])

        pie_data = [{"name": cat, "value": count} for cat, count in category_counts.items() if count > 0]
        insights = {
            cat: (category_feedbacks[cat][:6] or [category_summaries.get(cat, "No significant issues mentioned.")])
            for cat in CATEGORIES
            if category_counts.get(cat, 0) > 0
        }
        top_insight = (
            max(category_summaries.items(), key=lambda kv: len(kv[1]))[1]
            if category_summaries
            else (positives[0] if positives else "No strong themes detected.")
        )

        return {
            "top_insight": top_insight,
            "pie_data": pie_data,
            "insights": insights,
            "positive_highlights": positives[:6],
            "delight_distribution": delight_distribution,
        }
