"""
FlameGuard engine: the retrieval + evidence logic from the notebook
(steps 1-12 and the relevance guard), as a plain module with no Colab code.

It reads the NASA files from DATA_DIR:
  measurements*.csv   long format: experiment_id, test_id, material, variable, value, unit, ...
  experiments*.json   {"experiments": [...]}
  evidence*.json      {"evidence": [...], "sources": [...]}
  <any>.csv           data-quality report (has issue_id + severity columns)   [optional]
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ADMIN_VARIABLES = {
    "as_run_test_number", "test_number", "sample_number", "run_number", "total_frames_shot",
}
KNOWN_MATERIALS = [
    "pmma", "nomex", "ultem", "kapton", "teflon", "methanol", "heptane",
    "cotton", "fiberglass", "silicone", "sibal", "acrylic",
]
SUSPECT_WORDS = ("suspect", "invalid", "error")
EXPERIMENT_RE = re.compile(r"\bPSI[\s-]*(\d+)\b", re.I)


def clean(obj: Any) -> Any:
    """Make anything JSON-safe (NaN -> None, numpy -> python)."""
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        f = float(obj)
        return None if math.isnan(f) or math.isinf(f) else f
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if obj is pd.NaT:
        return None
    return obj


def clean_url(value: Any) -> str | None:
    """Evidence urls sometimes come as markdown links: [text](https://...)."""
    if not isinstance(value, str):
        return None
    value = value.strip()
    m = re.fullmatch(r"\[[^\]]+\]\((https?://[^)]+)\)", value)
    if m:
        return m.group(1)
    return value if value.startswith(("http://", "https://")) else None


class DataNotFound(RuntimeError):
    pass


class FlameGuardEngine:
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self._load()
        self._index()

    # ------------------------------------------------------------------ load
    def _pick(self, pattern: str) -> Path:
        files = sorted(self.data_dir.glob(pattern), key=lambda p: p.stat().st_size, reverse=True)
        if not files:
            raise DataNotFound(f"No file matching '{pattern}' in {self.data_dir}")
        return files[0]

    def _load(self) -> None:
        self.df = pd.read_csv(self._pick("measurements*.csv"), low_memory=False)
        need = {"experiment_id", "test_id", "material", "variable", "value", "unit"}
        missing = need - set(self.df.columns)
        if missing:
            raise DataNotFound(f"measurements csv is missing columns: {sorted(missing)}")
        for col in ("raw_value", "quality_flag", "source_row"):
            if col not in self.df.columns:
                self.df[col] = np.nan

        try:
            exp = json.loads(self._pick("experiments*.json").read_text(encoding="utf-8"))
            self.experiments = exp["experiments"] if isinstance(exp, dict) else exp
        except DataNotFound:
            self.experiments = []

        ev = json.loads(self._pick("evidence*.json").read_text(encoding="utf-8"))
        self.evidence = ev.get("evidence", [])
        self.sources = {s["source_id"]: s for s in ev.get("sources", [])}

        self.quality = None
        for path in sorted(self.data_dir.glob("*.csv")):
            try:
                head = pd.read_csv(path, nrows=2)
            except Exception:
                continue
            if {"issue_id", "severity", "experiment_id"} <= set(head.columns):
                self.quality = pd.read_csv(path)
                break

    # ----------------------------------------------------------------- index
    def _index(self) -> None:
        self.tests: list[dict[str, Any]] = []
        self.by_test: dict[str, pd.DataFrame] = {}
        docs: list[str] = []
        for test_id, group in self.df.groupby("test_id", sort=False):
            first = group.iloc[0]
            parts = [
                f"Experiment: {first['experiment_id']}",
                f"Test: {test_id}",
                f"Material: {first['material']}",
            ]
            for row in group.itertuples(index=False):
                val = row.value if pd.notna(row.value) else row.raw_value
                if pd.isna(val):
                    continue
                unit = row.unit if pd.notna(row.unit) else ""
                parts.append(f"{row.variable}: {val} {unit}")
            self.tests.append({
                "test_id": test_id,
                "experiment_id": first["experiment_id"],
                "material": first["material"] if pd.notna(first["material"]) else "unknown material",
            })
            docs.append("\n".join(parts))
            self.by_test[test_id] = group
        self.documents = docs
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        self.matrix = self.vectorizer.fit_transform(docs)
        self.ev_vectorizer = self.ev_matrix = None
        if self.evidence:
            self.ev_vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
            self.ev_matrix = self.ev_vectorizer.fit_transform([e.get("claim", "") for e in self.evidence])

    # ---------------------------------------------------------------- search
    @staticmethod
    def requested_experiments(query: str) -> list[str]:
        nums = list(dict.fromkeys(EXPERIMENT_RE.findall(query)))
        return [f"PSI-{int(n)}" for n in nums]

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        qv = self.vectorizer.transform([query])
        scores = cosine_similarity(qv, self.matrix).flatten()

        wanted = set(self.requested_experiments(query))
        if wanted and any(t["experiment_id"] in wanted for t in self.tests):
            for i, t in enumerate(self.tests):
                if t["experiment_id"] not in wanted:
                    scores[i] = 0.0

        out = []
        for idx in np.argsort(scores)[::-1]:
            if scores[idx] <= 0:
                break
            t = self.tests[idx]
            data = self.by_test[t["test_id"]]
            out.append({
                **t,
                "relevance_score": round(float(scores[idx]), 4),
                "measurement_count": int(len(data)),
            })
            if len(out) >= top_k:
                break
        return out

    # -------------------------------------------------------------- evidence
    def _passport_item(self, ev: dict[str, Any], test_id: str | None) -> dict[str, Any]:
        linked = ev.get("linked_test_ids") or []
        src = self.sources.get(ev.get("source_id"), {})
        return {
            "evidence_id": ev.get("evidence_id"),
            "experiment_id": ev.get("experiment_id"),
            "claim": ev.get("claim", ""),
            "claim_type": ev.get("claim_type"),
            "confidence": ev.get("confidence"),
            "source_title": src.get("title"),
            "source_url": clean_url(src.get("url")),
            "verified_against_data": ev.get("verified_against_data"),
            "caveats": ev.get("caveats"),
            "needs_human_check": bool(ev.get("needs_human_check")),
            "scope": "test_specific" if test_id and test_id in linked else "experiment_general",
        }

    def evidence_passport(self, experiment_id: str, test_id: str | None = None) -> list[dict[str, Any]]:
        passport = []
        for ev in self.evidence:
            if ev.get("experiment_id") != experiment_id:
                continue
            linked = ev.get("linked_test_ids") or []
            if test_id and linked and test_id not in linked:
                continue
            passport.append(self._passport_item(ev, test_id))
        return passport

    def search_evidence(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """Literature claims matching the question, across ALL experiments (or only the ones named)."""
        if not self.evidence:
            return []
        wanted = set(self.requested_experiments(query))
        scores = cosine_similarity(self.ev_vectorizer.transform([query]), self.ev_matrix).flatten()
        out = []
        for i in np.argsort(scores)[::-1]:
            if scores[i] <= 0:
                break
            ev = self.evidence[i]
            if wanted and ev.get("experiment_id") not in wanted:
                continue
            item = self._passport_item(ev, None)
            item["evidence_relevance"] = round(float(scores[i]), 4)
            out.append(item)
            if len(out) >= top_k:
                break
        return self.material_guard(query, out)

    @staticmethod
    def rank_evidence(query: str, findings: list[dict[str, Any]], top_k: int = 5) -> list[dict[str, Any]]:
        if not findings:
            return []
        try:
            vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
            mat = vec.fit_transform([f["claim"] for f in findings])
            scores = cosine_similarity(vec.transform([query]), mat).flatten()
        except ValueError:  # empty vocabulary
            return []
        ranked = []
        for i in scores.argsort()[::-1]:
            if scores[i] <= 0:
                break
            item = dict(findings[i])
            item["evidence_relevance"] = round(float(scores[i]), 4)
            ranked.append(item)
            if len(ranked) >= top_k:
                break
        return ranked

    @staticmethod
    def material_guard(query: str, findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        q = query.lower()
        wanted = {m for m in KNOWN_MATERIALS if re.search(rf"\b{re.escape(m)}\b", q)}
        out = []
        for f in findings:
            claim = f["claim"].lower()
            mentioned = {m for m in KNOWN_MATERIALS if re.search(rf"\b{re.escape(m)}\b", claim)}
            if not wanted:
                status = "general_evidence"
            elif wanted & mentioned:
                status = "material_match"
            elif mentioned:
                status = "different_material"
            else:
                status = "material_not_specified"
            item = dict(f)
            item["material_relevance_status"] = status
            item["direct_material_match"] = status == "material_match"
            out.append(item)
        return out

    # --------------------------------------------------------------- quality
    def quality_report(self, experiment_id: str, test_id: str | None = None) -> dict[str, Any]:
        empty = {"experiment_id": experiment_id, "test_id": test_id, "total_issues": 0,
                 "high": 0, "medium": 0, "low": 0, "info": 0, "issues": []}
        if self.quality is None:
            return empty
        q = self.quality
        issues = q[q["experiment_id"] == experiment_id]
        if test_id is not None:
            issues = issues[(issues["test_id"] == test_id) | (issues["test_id"].isna())]
        sev = issues["severity"]
        issues = issues.astype(object).where(issues.notna(), None)
        return {
            "experiment_id": experiment_id,
            "test_id": test_id,
            "total_issues": int(len(issues)),
            "high": int((sev == "high").sum()),
            "medium": int((sev == "medium").sum()),
            "low": int((sev == "low").sum()),
            "info": int((sev == "info").sum()),
            "issues": issues.to_dict(orient="records"),
        }

    def test_quality_counts(self) -> dict[str, dict[str, int]]:
        """test_id -> {'total': n, 'high': n}  (test-specific issues only)."""
        if self.quality is None:
            return {}
        q = self.quality[self.quality["test_id"].notna()]
        out: dict[str, dict[str, int]] = {}
        for tid, g in q.groupby("test_id"):
            out[tid] = {"total": int(len(g)), "high": int((g["severity"] == "high").sum())}
        return out

    # ------------------------------------------------------------- the whole
    @staticmethod
    def evidence_gaps(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not results:
            return [{"type": "no_matching_tests",
                     "message": "No matching tests found in the indexed dataset."}]
        gaps = []
        for r in results:
            ev = r["evidence"]
            if not any(e["scope"] == "test_specific" for e in ev):
                gaps.append({"test_id": r["test_id"], "type": "missing_test_specific_evidence",
                             "message": "Only experiment-level scientific evidence is available."})
            if not ev:
                gaps.append({"test_id": r["test_id"], "type": "missing_scientific_evidence",
                             "message": "No scientific evidence linked to this result."})
            if any(e.get("needs_human_check") for e in ev):
                gaps.append({"test_id": r["test_id"], "type": "human_verification_required",
                             "message": "One or more linked claims require human verification."})
        return gaps

    def investigate(self, query: str, top_k: int = 5) -> dict[str, Any]:
        results = []
        for hit in self.search(query, top_k=top_k):
            passport = self.evidence_passport(hit["experiment_id"], hit["test_id"])
            ranked = self.rank_evidence(query, passport, top_k=5)
            results.append({
                **hit,
                "evidence": self.material_guard(query, ranked),
                "evidence_candidates": len(passport),
                "data_quality": self.quality_report(hit["experiment_id"], hit["test_id"]),
            })
        return {
            "query": query,
            "total_results": len(results),
            "results": results,
            "evidence_gaps": self.evidence_gaps(results),
            "disclaimer": ("Relevance is not fire risk. Scientific claims may require verification. "
                           "Experiment-level evidence does not prove individual test outcomes."),
        }

    # ----------------------------------------------------------- measurements
    def test_measurements(self, test_id: str, limit: int = 4) -> list[str]:
        """Short 'variable value unit' strings for physical measurements of a test."""
        g = self.by_test.get(test_id)
        if g is None:
            return []
        out = []
        for row in g.itertuples(index=False):
            if row.variable in ADMIN_VARIABLES or pd.isna(row.value):
                continue
            flag = str(row.quality_flag).lower()
            if any(w in flag for w in SUSPECT_WORDS):
                continue
            unit = f" {row.unit}" if pd.notna(row.unit) and row.unit != "setting" else ""
            out.append(f"{row.variable} {row.value:g}{unit}")
            if len(out) >= limit:
                break
        return out
