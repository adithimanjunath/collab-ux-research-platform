from typing import List, Dict, Any, cast, Iterable, Tuple
import re,os
from .base import UXModel, CATEGORIES, passes_category_gate, sort_categories,PREF_RANK, CATEGORY_HINTS

# ---- Small adapters that mimic transformers pipelines but call HF API ----
class _RemoteZeroShotPipeline:
    def __call__(self, sequences, *, candidate_labels, multi_label=True,
                 batch_size=None, truncation=True, hypothesis_template="This text is about {}."):
        from services.hf_client import zsc_single
        def one(s: str):
            out = zsc_single(
                s, candidate_labels,
                multi_label=multi_label,
                hypothesis_template=hypothesis_template,
            )
            return {
                "labels": out.get("labels", []) or [],
                "scores": [float(x) for x in (out.get("scores", []) or [])],
            }
        if isinstance(sequences, (list, tuple)):
            return [one(s) for s in sequences]
        return one(sequences)

class _RemoteSentimentPipeline:
    def __call__(self, sequences, batch_size=None, truncation=True):
        from services.hf_client import sa_single
        def one(s: str):
            out = sa_single(s)
            return {"label": out.get("label", ""), "score": float(out.get("score", 0.0))}
        if isinstance(sequences, (list, tuple)):
            return [one(s) for s in sequences]
        return one(sequences)

class _RemoteSummarizerPipeline:
    def __call__(self, text, max_length=60, min_length=20, do_sample=False):
        from services.hf_client import sum_single
        return sum_single(text, max_length=max_length, min_length=min_length,do_sample=do_sample)


class HFZeroShotModel(UXModel):
    name = "hf_zero_shot"
    _classifier = None
    _sentiment = None
    _summarizer = None

     # ---- Tunable thresholds (report these in thesis) ----
    CRITIQUE_NEG_PROB = 0.60          
    ZSC_THRESHOLD = 0.60        
    TOP_K=3                      
    DELIGHT_TOP1_THRESHOLD = 0.35     
    DELIGHT_MAX_ITEMS = int(os.getenv("DELIGHT_MAX_ITEMS", "1000")) 

        # ---- Batch sizes (configurable via environment) ----
    BATCH_SA = int(os.getenv("BATCH_SA", "32"))   # Sentiment Analysis
    BATCH_ZSC = int(os.getenv("BATCH_ZSC", "8"))  # Zero-Shot Classification
    ZSC_HYPOTHESIS = os.getenv("ZSC_HYPOTHESIS", "This text is about {}.")

    @classmethod
    def _get_pipes(cls):
               # Prefer remote (HF serverless)
            if cls._classifier is None:
                cls._classifier = _RemoteZeroShotPipeline()
            if cls._sentiment is None:
                cls._sentiment = _RemoteSentimentPipeline()
            if cls._summarizer is None:
                cls._summarizer = _RemoteSummarizerPipeline()
            return cls._classifier, cls._sentiment, cls._summarizer
    @staticmethod
    def _dedupe_keep_order(seq: list[str]) -> list[str]:
        seen = set()
        out = []
        for s in seq:
            key = s.strip().lower()
            if key and key not in seen:
                seen.add(key)
                out.append(s)
        return out

    # ---- Negation-aware patterns ----
    _SAFE_NEGATED_PROBLEMS_RE = re.compile(
        r'\b(?:no|without)\s+(?:major\s+)?(?:issues?|problems?|bugs?|errors?)\b',
        re.IGNORECASE,
    )
    _KEYWORD_PATTERNS: Tuple[re.Pattern[str], ...]= tuple(
        re.compile(rx, re.IGNORECASE)
        for rx in(
        r'\bshould\b',
        r"\bcould(?:n't| not| be)\b",
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

    @staticmethod
    def _has_suggestion_keyword(text: str) -> bool:
        """Return True if text implies a critique/suggestion (negation-aware)."""
        if HFZeroShotModel._SAFE_NEGATED_PROBLEMS_RE.search(text):
            return False
        for rx in HFZeroShotModel._KEYWORD_PATTERNS:
            if rx.search(text):
                return True
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
        for delim in (" but ", " however "):
            idx = lower.find(delim)
            if idx != -1:
                start = idx + len(delim)
                return feedback[start:].strip().lstrip(".,:;! ")
        if lower.startswith(("although", "though")) and "," in feedback:
            return feedback.split(",", 1)[1].strip().lstrip(".,:;! ")
        return feedback.strip()
    
    @staticmethod
    def _extract_praise_clause(text: str) -> str:
        """
        For mixed praise/critique sentences, keep a clean praise clause.
        Strategy:
        1) Pick the last sentence containing a positive keyword.
        2) Otherwise, keep the part after 'but'/'however' (often the praise).
        3) Fallback to original text stripped.
        """
        pos_rx = re.compile(r"\b(love|liked|like|great|clean|fast|intuitive|modern|easy|nice|beautiful|excellent|awesome)\b", re.I)
        # sentence-first pass (pick last positive sentence)
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        for s in reversed(sentences):
            if pos_rx.search(s):
                return s.strip()
        lower = text.lower()
        for delim in (" but ", " however "):
            idx = lower.find(delim)
            if idx != -1:
                return text[idx + len(delim):].strip().lstrip(".,:;! ")
        return text.strip()

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
        for _, chunk in self._batch(items, size=self.BATCH_SA):
            sa = cast(List[Dict[str, Any]], sentiment_analyzer(chunk, batch_size=self.BATCH_SA, truncation=True))
            sa_results.extend(sa)

        is_critique_mask: List[bool] = []
        for text, sa in zip(items, sa_results):
            if HFZeroShotModel._SAFE_NEGATED_PROBLEMS_RE.search(text):
                is_critique_mask.append(False)
                continue
            suggestive = self._has_suggestion_keyword(text)
            label = str(sa.get("label", "")).upper()
            score = float(sa.get("score", 0.0))
            pos_prob = score if label == "POSITIVE" else (1.0 - score)
            neg_prob = 1.0 - pos_prob
            is_critique_mask.append(True if suggestive else (neg_prob >= self.CRITIQUE_NEG_PROB))

        # --- 2) Build critique set (with clause focusing)
        critiques: List[str] = []
        for text, is_crit in zip(items, is_critique_mask):
            if is_crit:
                critiques.append(self._strip_mixed_clause(text))
                

        # --- 3) Multi-label ZSC on critiques (batched)
        category_feedbacks: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}
        if critiques:
            zsc_outputs: List[Dict[str, Any]] = []
            for _, chunk in self._batch(critiques, size=self.BATCH_ZSC):
                out = cast(
                    List[Dict[str, Any]],
                    classifier(
                        chunk,
                        candidate_labels=CATEGORIES,
                        multi_label=True,
                        batch_size=self.BATCH_ZSC,
                        truncation=True,
                        hypothesis_template=self.ZSC_HYPOTHESIS,
                    ),
                )
                zsc_outputs.extend(out)

            for crit_text, z in zip(critiques, zsc_outputs):
                labels = z.get("labels", []) or []
                scores = [float(s) for s in (z.get("scores", []) or [])]
                sorted_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
                kept = [(labels[i], scores[i]) for i in sorted_idx[:self.TOP_K] if scores[i] >= self.ZSC_THRESHOLD]
                kept = [(lab, sc) for (lab, sc) in kept if passes_category_gate(lab, crit_text)]
            
                # prefer specific UX themes over generic "Feedback"
                if any(lab in ["Usability","Navigation","Performance","Responsiveness","Visual Design"] for lab, _ in kept):
                    kept = [(lab, sc) for lab, sc in kept if lab != "Feedback"]

                # (optional) Performance/Responsiveness guard for “slow”
                if any(lab == "Performance" for lab, _ in kept):
                    if not re.search(r"\b(slow|lag|latency|freeze\w*|hang\w*|loading|waiting\s*time|delay(ed)?|takes?\s+too\s+long|sluggish|spinner|spinning)\b", crit_text, re.I):
                        kept = [(lab, sc) for lab, sc in kept if lab != "Performance"]
                
                lower = crit_text.lower()
                if not kept:   
                    # Usability heuristics
                    if any(word in lower for word in ["confusing", "not intuitive", "hard to find"]):
                        kept.append(("Usability", 0.51))   # assign minimal score

                    # Navigation heuristics
                    if ("navigation" in lower or "find the settings" in lower or re.search(r"\b(could(?:n['’]t| not)|can(?:n['’]t| not))\s+find.*\bsubmit\s+button\b", lower)):
                        kept.append(("Navigation", 0.51))

                # NEW: Responsiveness heuristics (unresponsive, layout breaks/overlap, mobile issues)
                    if (re.search(r"\bunresponsive\b", lower) or
                        re.search(r"\blayout\s*(?:breaks?|broken)\b", lower) or
                        re.search(r"\boverlap\w*\b", lower) or
                        re.search(r"\b(responsive|breakpoint|mobile|tablet|phone|screen\s*size|resize|viewport)\b", lower)):
                        kept.append(("Responsiveness", 0.51))
                if not kept:
                    kept = [("Feedback", 0.51)]
                seen_labs = set()
                for lab, _ in kept:
                    if lab in CATEGORIES and lab not in seen_labs:
                        seen_labs.add(lab)
                        if crit_text not in category_feedbacks[lab]:
                            category_feedbacks[lab].append(crit_text)

        # --- 4) Delight: top-1 label on positives (batched, optional cap)
        positives: List[str] = [t for t, is_crit in zip(items, is_critique_mask) if not is_crit]
        praise_only: List[str] = [self._extract_praise_clause(t) for t in positives]
        positive_comments = praise_only[: self.DELIGHT_MAX_ITEMS]# cap to protect worst-case 
        positive_highlights = praise_only[:6]

        delight_counts: Dict[str, int] = {cat: 0 for cat in CATEGORIES}
        delight_by_theme: Dict[str, List[str]] = {}

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
                        hypothesis_template=self.ZSC_HYPOTHESIS,
                    ),
                )
                zsc_pos_outputs.extend(out)

            # Map each positive comment to its top-1 label when confident enough
            for text, z in zip(positive_comments, zsc_pos_outputs):
                labels = z.get("labels", [""])[0]
                scores = [float(s) for s in (z.get("scores", []) or [])]
                pairs = list(zip(labels, scores))

                pairs.sort(key=lambda t: t[1], reverse=True)
                kept: List[Tuple[str, float]] = [(l, s) for (l, s) in pairs if s >= self.DELIGHT_TOP1_THRESHOLD][:1]
                if any(l in ["Usability","Navigation","Performance","Responsiveness","Visual Design"] for l, _ in kept):
                    kept = [(l,s) for l,s in kept if l != "Feedback"]

                praise_text = self._extract_praise_clause(text)
                seen: set[str] = set()

                for lab, _ in kept:
                    if lab in CATEGORIES and lab not in seen:
                        seen.add(lab)
                        delight_counts[lab] += 1
                        arr = delight_by_theme.setdefault(lab, [])
                        if praise_text not in arr:
                            arr.append(praise_text)

        for text in positive_comments:
            praise_text = self._extract_praise_clause(text)
            already = any(praise_text in arr for arr in delight_by_theme.values())
            if already:
                continue
            low= text.lower()
            placed = False
            for cat, rx in CATEGORY_HINTS.items():
                try:
                    if rx.search(low):
                        delight_by_theme.setdefault(cat, []).append(praise_text)
                        delight_counts[cat] += 1
                        placed = True
                        break
                except Exception:
                    pass
            if placed:
                continue

            delight_by_theme.setdefault("Feedback", []).append(praise_text)
            delight_counts["Feedback"] += 1

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

        # --- 6) De‑dupe feedbacks per category and compute counts
        for cat in CATEGORIES:
            seen: set[str] = set()
            deduped: List[str] = []
            for s in category_feedbacks.get(cat, []):
                key = s.strip().lower()
                if key and key not in seen:
                    seen.add(key)
                    deduped.append(s)
                if len(deduped) >= 6:  # keep UI cap
                    break
            category_feedbacks[cat] = deduped

        # counts used by both insights and pie
        category_counts: Dict[str, int] = {cat: len(category_feedbacks.get(cat, [])) for cat in CATEGORIES}

        # --- 7) Build insights (with summary fallback), ordered
        insights: Dict[str, List[str]] = {}
        for cat in CATEGORIES:
            if category_counts.get(cat, 0) > 0:
                insights[cat] = category_feedbacks[cat] or [category_summaries.get(cat, "No significant issues mentioned.")]
        if insights:
            ordered_keys = sort_categories(list(insights.keys()))
            insights = {k: insights[k] for k in ordered_keys}

        # --- 8) Pie data from counts (keeps pie in sync with card counts)
        nonzero = [c for c in CATEGORIES if category_counts[c] > 0]
        pie_order = sort_categories(nonzero)
        pie_data = [{"name": c, "value": category_counts[c]} for c in pie_order]

        # --- 9) Top insight
        top_insight = (
            max(category_summaries.items(), key=lambda kv: len(kv[1]))[1]
            if category_summaries
            else (positives[0] if positives else "No strong themes detected.")
        )

        # --- 10) Respect DELIGHT_MAX_ITEMS for positives (already enforced above)
        positive_highlights = positive_comments[:6]

        return {
            "top_insight": top_insight,
            "pie_data": pie_data,
            "insights": insights,
            "positive_highlights": positive_highlights,
            "delight_distribution": delight_distribution,
            "delight_by_theme": delight_by_theme,
        }

    def _analyze_heuristics_only(self, items: List[str]) -> Dict[str, Any]:
        # Determine critiques using negation-aware keywords
        is_critique = [self._has_suggestion_keyword(t) for t in items]

        # Categorize critiques using regex hints and additional responsiveness heuristics
        category_feedbacks: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}
        for text, crit in zip(items, is_critique):
            if not crit:
                continue
            lower = text.lower()
            matched: set[str] = set()
            # Base hints from CATEGORY_HINTS
            for cat, rx in CATEGORY_HINTS.items():
                try:
                    if rx.search(lower):
                        matched.add(cat)
                except Exception:
                    pass
            # Extra responsiveness heuristics
            if re.search(r"\bunresponsive\b|\blayout\s*(?:breaks?|broken)\b|\boverlap\w*\b|\b(responsive|breakpoint|mobile|tablet|phone|screen\s*size|resize|viewport)\b", lower, re.I):
                matched.add("Responsiveness")
            # Navigation quick rule
            if re.search(r"(couldn['’]t|can['’]t|cannot)\s+find.*\b(submit|menu|settings)\b", lower):
                matched.add("Navigation")
            # Usability quick rule
            if re.search(r"\b(confus\w+|not\s+intuitive|hard\s+to\s+(find|use))\b", lower):
                matched.add("Usability")
            # Performance quick rule
            if re.search(r"\b(slow|lag|takes?\s+too\s+long)\b", lower):
                matched.add("Performance")

            if not matched:
                matched.add("Feedback")

            for cat in matched:
                if text not in category_feedbacks[cat]:
                    category_feedbacks[cat].append(text)

        # Positive highlights: keep short praise-only snippets
        positives = [t for t, c in zip(items, is_critique) if not c]
        praise = [self._extract_praise_clause(t) for t in positives][:6]

        # Build outputs
        counts = {cat: len(category_feedbacks.get(cat, [])) for cat in CATEGORIES}
        nonzero = [c for c in CATEGORIES if counts[c] > 0]
        pie_order = sort_categories(nonzero)
        pie_data = [{"name": c, "value": counts[c]} for c in pie_order]

        insights = {cat: vals[:6] for cat, vals in category_feedbacks.items() if vals}
        if insights:
            ordered = sort_categories(list(insights.keys()))
            insights = {k: insights[k] for k in ordered}

        top_insight = (
            insights[next(iter(insights))][0] if insights else (positives[0] if positives else "No strong themes detected.")
        )

        delight_distribution = [{"name": c, "value": 0} for c in CATEGORIES]

        return {
            "top_insight": top_insight,
            "pie_data": pie_data,
            "insights": insights,
            "positive_highlights": praise,
            "delight_distribution": delight_distribution,
               
        }
