"""Turns the new FlameGuard X output (flameguard_unified_query) into the chat reply the website shows:
{answer, sources[{id,title,snippet,url?|experimentId?}], followUps[]}.

The model returns data, not sentences, so every sentence here is assembled from its numbers.
Written defensively: if your friend changes a key, that part is skipped (or printed generically)
instead of crashing the chat."""
from __future__ import annotations

import re
from typing import Any

from .engine import FlameGuardEngine, clean

MAX_TESTS = 2
MAX_LITERATURE = 2


def _num(x: Any, signed: bool = False) -> str:
    if not isinstance(x, (int, float)) or isinstance(x, bool):
        return str(x)
    s = f"{x:+.3g}" if signed else f"{x:.3g}"
    return s


def _strength(r: float) -> str:
    a = abs(r)
    word = "negligible" if a < 0.1 else "weak" if a < 0.3 else "moderate" if a < 0.5 else "strong"
    return f"{word} {'positive' if r > 0 else 'negative'}" if a >= 0.1 else word


def _material_and_text(snippet: str) -> tuple[str, str]:
    """'PSI-69 PSI-69-T168 material methanol. o initial ... 0.21' -> ('methanol', 'o initial ... 0.21')"""
    m = re.search(r"material (.*?)\. (.*)", snippet or "", flags=re.S)
    return (m.group(1).strip(), m.group(2).strip()) if m else ("", (snippet or "").strip())


def _gas_sentence(results: dict[str, Any]) -> str:
    bits = []
    for gas, d in results.items():
        if not isinstance(d, dict) or not d.get("paired_measurements") or d.get("median_change") is None:
            continue
        bits.append(
            f"{gas} {_num(d['median_change'], True)} {d.get('unit', '')} (n={d['paired_measurements']}; "
            f"{d.get('increased', 0)} rose, {d.get('decreased', 0)} fell)"
        )
    return "median change " + ", ".join(bits) if bits else ""


def _generic(results: Any) -> str:
    """Unknown result shape: show a few plain scalar values rather than nothing."""
    if isinstance(results, dict):
        flat = [f"{k.replace('_', ' ')} {_num(v)}" for k, v in results.items() if isinstance(v, (int, float, str)) and v not in ("", None)]
        return ", ".join(flat[:5])
    return ""


def describe_analysis(exp: str, a: dict[str, Any]) -> str:
    """One sentence (without the [n] marker) about one experiment's scientific analysis."""
    status = a.get("status")
    note = a.get("analysis") if isinstance(a.get("analysis"), str) else ""
    if status in ("LIMITED", "INSUFFICIENT_DATA") or ("results" not in a and "pearson_r" not in a):
        label = "has insufficient data for a reliable analysis" if status == "INSUFFICIENT_DATA" else "has limited data"
        return f"{exp} {label}: {note.rstrip('.')}." if note else f"{exp} {label}."
    if "pearson_r" in a:
        r, n = a.get("pearson_r"), a.get("complete_pairs_used")
        if r is None:
            return f"{exp}: not enough complete test pairs to relate oxygen concentration to burn time."
        return (f"In {exp}, oxygen concentration and burn time show a {_strength(r)} linear association "
                f"(Pearson r = {r:.2f}, {n} complete test pairs)")
    results = a.get("results")
    if isinstance(results, dict):
        gas = _gas_sentence(results)
        if gas:
            return f"In {exp}, across paired before and after measurements, {gas}"
    text = _generic(results) or _generic(a)
    return f"{exp} - {note.rstrip('.')}: {text}" if text else f"{exp} analysis is available ({note})" if note else f"{exp} analysis is available"


def _eligible_share(a: dict[str, Any]) -> tuple[int, int] | None:
    dq = a.get("data_quality_summary")
    if not isinstance(dq, dict) or not dq:
        return None
    total = sum(v for v in dq.values() if isinstance(v, (int, float)))
    ok = dq.get("PRELIMINARY_ELIGIBLE", 0)
    return (int(ok), int(total)) if total else None


def build_chat_reply_v2(unified: dict[str, Any], query: str, legacy: FlameGuardEngine | None = None) -> dict[str, Any]:
    exps = [e for e in (unified.get("requested_experiments") or []) if isinstance(e, str)]
    analyses = unified.get("scientific_analysis") or {}
    hits = [h for h in (unified.get("retrieved_evidence") or []) if isinstance(h, dict) and h.get("test_id")]
    warnings = [w for w in (unified.get("safety_warnings") or []) if isinstance(w, str)]

    sources: list[dict[str, Any]] = []
    sentences: list[str] = []

    def add_source(**kw: Any) -> int:
        sid = len(sources) + 1
        sources.append({"id": sid, **{k: v for k, v in kw.items() if v}})
        return sid

    def first_test(exp: str) -> str | None:
        return next((h["test_id"] for h in hits if h.get("experiment_id") == exp), None)

    # ---- 1. scientific analysis of the experiments the user named
    for exp, a in analyses.items():
        if not isinstance(a, dict):
            continue
        sid = add_source(
            title=f"{exp} analysis",
            snippet=a.get("interpretation") or a.get("analysis") or "Descriptive analysis of the available measurements.",
            experimentId=first_test(exp),
        )
        sentences.append(f"{describe_analysis(exp, a).rstrip('.')} [{sid}].")
        share = _eligible_share(a)
        if share and share[0] < share[1]:
            sentences.append(f"Only {share[0]} of {share[1]} {exp} measurements passed the data-quality screening [{sid}].")
        if a.get("interpretation"):
            sentences.append(str(a["interpretation"]).rstrip() if str(a["interpretation"]).rstrip().endswith(".")
                             else str(a["interpretation"]).rstrip() + ".")

    # ---- 2. literature claims with web links (from evidence.json, via the legacy engine if it is loaded)
    lit: list[dict[str, Any]] = []
    if legacy is not None:
        try:
            lit = [e for e in legacy.search_evidence(query, top_k=5)
                   if e.get("material_relevance_status") != "different_material"][:MAX_LITERATURE]
        except Exception:
            lit = []
    if lit:
        sentences.append("NASA documentation notes:")
    for ev in lit:
        sid = add_source(title=ev.get("source_title") or f"Evidence {ev.get('evidence_id')}",
                         snippet=ev.get("claim", ""), url=ev.get("source_url"))
        claim = ev.get("claim", "").rstrip()
        claim = claim if claim.endswith((".", "!", "?")) else claim + "."
        sentences.append(f"{ev.get('experiment_id', '')}: {claim} [{sid}]".strip(": "))

    # ---- 3. closest matching tests
    shown, seen = [], set()
    for h in hits:
        if h["test_id"] not in seen:
            seen.add(h["test_id"])
            shown.append(h)
        if len(shown) >= MAX_TESTS:
            break
    if shown:
        marks = []
        for h in shown:
            material, text = _material_and_text(h.get("snippet", ""))
            sid = add_source(title=f"Test {h['test_id']}" + (f": {material}" if material else ""),
                             snippet=text[:220], experimentId=h["test_id"])
            marks.append(f"{h['test_id']}" + (f" ({material})" if material else "") + f" [{sid}]")
        lead = "The closest matching tests are " if exps or analyses else \
            "I did not detect an experiment ID (for example PSI-69), so these are the closest tests across all experiments: "
        sentences.append(lead + " and ".join(marks) + ".")

    if not sentences:
        return clean({
            "answer": ("I could not find anything in the NASA combustion dataset that matches that question. "
                       "Try naming an experiment such as PSI-69, a material such as PMMA, or a measurement like oxygen or burn time."),
            "sources": [], "followUps": _followups(exps),
        })

    # ---- 4. honest closing notes
    causal = [w for w in warnings if re.search(r"causal|fire.?risk|prediction", w, re.I)]
    if causal:
        sentences.append("This system cannot prove causes or predict fire risk; it only describes the measurements.")
    if lit and any(re.search(r"human review", w, re.I) for w in warnings):
        sentences.append("The documentation claims above still need human verification.")
    sentences.append("These results are descriptive; relevance to your question is not fire risk.")

    return clean({"answer": " ".join(sentences), "sources": sources, "followUps": _followups(exps)})


def _followups(exps: list[str]) -> list[str]:
    pool = ["Analyze PSI-69: relationship between oxygen concentration and burn time",
            "PSI-25 oxygen and carbon monoxide changes",
            "PSI-98 combustion results",
            "PSI-102 weight loss"]
    out = [q for q in pool if not any(q.startswith(e) or f"{e}:" in q or f"{e} " in q for e in exps)]
    return out[:3]
