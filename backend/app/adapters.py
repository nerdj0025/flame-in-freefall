"""Turns engine output into exactly the JSON shapes the React front end expects."""
from __future__ import annotations

import re
from typing import Any

import pandas as pd

from .engine import ADMIN_VARIABLES, SUSPECT_WORDS, FlameGuardEngine, clean

# ---------------------------------------------------------------------------
# /experiments
# ---------------------------------------------------------------------------
# Where to look in experiments.json for the labels the dashboard filters on.
# Edit these lists if your file uses other names. If nothing is found the value is "unspecified".
GRAVITY_KEYS = ["gravity_level", "gravityLevel", "gravity", "gravity_regime", "environment"]
FLAME_TYPE_KEYS = ["flame_type", "flameType", "flame_configuration", "configuration"]
TITLE_KEYS = ["title", "name", "experiment_name"]

# Measurement variable -> front-end field the dashboard already knows (with unit conversion).
KNOWN_FIELDS = {
    "o2_initial_pct_vol": ("oxygenPercent", 1.0),      # %
    "ambient_pressure_mmhg": ("pressure", 0.133322),   # mmHg -> kPa
}


def camel(name: str) -> str:
    parts = re.split(r"[^0-9a-zA-Z]+", name.strip())
    parts = [p for p in parts if p]
    if not parts:
        return name
    return parts[0].lower() + "".join(p[:1].upper() + p[1:].lower() for p in parts[1:])


def _first(rec: dict[str, Any], keys: list[str]) -> str | None:
    for k in keys:
        v = rec.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def _experiment_meta(engine: FlameGuardEngine) -> dict[str, dict[str, Any]]:
    meta = {}
    for rec in engine.experiments:
        if isinstance(rec, dict):
            eid = rec.get("experiment_id") or rec.get("id")
            if eid:
                meta[str(eid)] = rec
    return meta


def build_experiments(engine: FlameGuardEngine) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """One dashboard record per NASA test. Returns (records, units-by-field)."""
    meta = _experiment_meta(engine)
    qcounts = engine.test_quality_counts()
    units: dict[str, str] = {"pressure": "kPa", "oxygenPercent": "%"}

    df = engine.df
    ok = df["value"].notna() & ~df["variable"].isin(ADMIN_VARIABLES)
    flag = df["quality_flag"].astype(str).str.lower()
    suspect = pd.Series(False, index=df.index)
    for w in SUSPECT_WORDS:
        suspect |= flag.str.contains(w, regex=False)
    num = df[ok & ~suspect]

    # first numeric value per (test, variable)
    first = num.drop_duplicates(["test_id", "variable"])
    values: dict[str, dict[str, float]] = {}
    for row in first.itertuples(index=False):
        field, factor = KNOWN_FIELDS.get(row.variable, (camel(row.variable), 1.0))
        values.setdefault(row.test_id, {})[field] = round(float(row.value) * factor, 4)
        if field not in units and pd.notna(row.unit) and row.unit not in ("setting",):
            units[field] = str(row.unit)

    records = []
    for t in engine.tests:
        em = meta.get(str(t["experiment_id"]), {})
        rec: dict[str, Any] = {
            "id": t["test_id"],
            "title": f'{t["test_id"]} - {t["material"]}',
            "fuel": t["material"],
            "gravityLevel": _first(em, GRAVITY_KEYS) or "unspecified",
            "flameType": _first(em, FLAME_TYPE_KEYS) or "unspecified",
            "experimentId": t["experiment_id"],
        }
        rec.update(values.get(t["test_id"], {}))
        q = qcounts.get(t["test_id"])
        rec["qualityIssues"] = q["total"] if q else 0
        records.append(rec)
    units["qualityIssues"] = ""
    return clean(records), units


# ---------------------------------------------------------------------------
# /chat
# ---------------------------------------------------------------------------
MAX_FINDINGS = 3
MAX_TESTS = 2


def contextualise(message: str, history: list[dict[str, str]]) -> str:
    """Short follow-ups ('why?') borrow the previous user question so retrieval has something to match."""
    if len(message.split()) >= 4 or not history:
        return message
    for m in reversed(history):
        if m.get("role") == "user" and m.get("content"):
            return f'{m["content"]} {message}'
    return message


def _followups(results: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    if results:
        top = results[0]
        out.append(f'What was measured in {top["experiment_id"]}?')
        out.append(f'{top["material"]} oxygen and burn time')
        out.append(f'{top["experiment_id"]} oxygen and carbon monoxide changes')
    else:
        out = ["PMMA combustion oxygen", "PSI-25 oxygen and carbon monoxide changes",
               "PSI-26 combustion results"]
    return out[:3]


def build_chat_reply(engine: FlameGuardEngine, message: str, history: list[dict[str, str]]) -> dict[str, Any]:
    query = contextualise(message, history)
    inv = engine.investigate(query, top_k=5)
    results = inv["results"]

    if not results:
        return {
            "answer": ("I could not find anything in the NASA combustion dataset that matches that question. "
                       "Try naming a material (for example PMMA), an experiment such as PSI-25, "
                       "or a measurement like oxygen or burn time."),
            "sources": [],
            "followUps": _followups([]),
        }

    # ---- literature findings: unique claims across all matched tests, best match first
    pool: dict[str, dict[str, Any]] = {}
    for ev in engine.search_evidence(query, top_k=5):
        pool[ev["evidence_id"]] = ev
    for r in results:
        for ev in r["evidence"]:
            cur = pool.get(ev["evidence_id"])
            if cur is None or ev["evidence_relevance"] > cur["evidence_relevance"]:
                pool[ev["evidence_id"]] = ev
    # drop claims about a different material than the one the user asked about
    usable = [e for e in pool.values() if e["material_relevance_status"] != "different_material"]
    findings = sorted(usable,
                      key=lambda e: (e["direct_material_match"], e["evidence_relevance"]),
                      reverse=True)[:MAX_FINDINGS]

    sources: list[dict[str, Any]] = []
    sentences: list[str] = []

    def add_source(**kw: Any) -> int:
        sid = len(sources) + 1
        sources.append({"id": sid, **{k: v for k, v in kw.items() if v}})
        return sid

    if findings:
        sentences.append("The NASA documentation records the following that relates to your question.")
        for ev in findings:
            snippet = ev["claim"]
            if ev.get("caveats"):
                snippet += f' (Caveat: {ev["caveats"]})'
            sid = add_source(title=ev.get("source_title") or f'Evidence {ev["evidence_id"]}',
                             snippet=snippet, url=ev.get("source_url"))
            claim = ev["claim"].rstrip()
            claim = claim if claim.endswith((".", "!", "?")) else claim + "."
            sentences.append(f'{ev["experiment_id"]}: {claim} [{sid}]')

    # ---- closest measured tests
    shown = results[:MAX_TESTS]
    markers = []
    for r in shown:
        q = r["data_quality"]
        bits = engine.test_measurements(r["test_id"])
        snippet = "; ".join(bits) if bits else "No usable numeric measurements recorded."
        if q["total_issues"]:
            snippet += f' | {q["total_issues"]} data-quality note(s), {q["high"]} high severity.'
        sid = add_source(title=f'Test {r["test_id"]}: {r["material"]}', snippet=snippet,
                         experimentId=r["test_id"])
        markers.append(f'{r["test_id"]} ({r["material"]}) [{sid}]')
    sentences.append("The closest matching measurements are tests " + " and ".join(markers) + ".")

    # ---- honest caveats
    if not findings:
        sentences.append("No literature claim in the dataset directly matches the wording of your question, "
                         "so only measurement records are shown.")
    if any(f.get("needs_human_check") for f in findings):
        sentences.append("Some of the claims above are marked as needing human verification.")
    high = sum(r["data_quality"]["high"] for r in shown)
    if high:
        sentences.append("At least one of these tests carries high-severity data-quality flags, "
                         "so treat its values with caution.")
    sentences.append("Relevance here means similarity to your wording, not fire risk.")

    return clean({"answer": " ".join(sentences), "sources": sources, "followUps": _followups(results)})
