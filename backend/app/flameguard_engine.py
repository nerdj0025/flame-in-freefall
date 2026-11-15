# VENDORED FILE: exported from the friend's notebook (cells 1,3,4,5,6). To update the model, replace this file
# with the new flameguard_engine.py. Only changes: DATA_DIR reads FF_DATA_DIR; one .to_numpy(copy=True) so it also runs on pandas 3.
import glob, os
import numpy as np
import pandas as pd

DATA_DIR = os.environ.get("FF_DATA_DIR", "/content")  # (backend: reads FF_DATA_DIR)

def _find(keyword, ext):
    for f in glob.glob(os.path.join(DATA_DIR, "**", "*" + ext), recursive=True):
        n = os.path.basename(f).lower()
        if keyword in n and "sample_data" not in f and "classified" not in n:
            return f
    raise FileNotFoundError(f"{keyword}*{ext} not found in {DATA_DIR}")

# ===== بند 5: جودة البيانات والأمان العلمي | Item 5: Data quality & safety =====
TEST_LEVEL = ["test_without_results", "non_test_record", "sample_label_conflict"]
BAD_FLAGS = ["suspect_value", "over_range", "video_only", "non_numeric", "censored_greater_than"]

def classify_measurements(meas, dq):
    meas = meas.copy()
    meas_vars = meas.groupby("experiment_id")["variable"].unique().to_dict()

    def expand_vars(exp, v):
        out = []
        for tok in str(v).split("/"):
            tok = tok.strip()
            out += [mv for mv in meas_vars.get(exp, []) if mv == tok or mv.startswith(tok + "_")]
        return out

    links = []
    for _, r in dq.iterrows():
        if r["issue_type"] in TEST_LEVEL:
            links.append((r["issue_id"], r["experiment_id"], r["test_id"], None, "test"))
        else:
            for v in expand_vars(r["experiment_id"], r["variable"]):
                links.append((r["issue_id"], r["experiment_id"], r["test_id"], v, "var"))

    def hits(issue_mask):
        ids = set(dq.loc[issue_mask, "issue_id"])
        mask = np.zeros(len(meas), dtype=bool)
        for iid, exp, tid, var, kind in links:
            if iid not in ids:
                continue
            m = (meas["experiment_id"] == exp).to_numpy(copy=True)  # backend patch: pandas 3 returns read-only arrays
            if kind == "test":
                if pd.isna(tid):
                    continue
                m &= (meas["test_id"] == tid).values
            else:
                m &= (meas["variable"] == var).values
                if pd.notna(tid):
                    m &= (meas["test_id"] == tid).values
            mask |= m
        return mask

    has_value = meas["value"].notna().values
    not_test_level = ~dq["issue_type"].isin(TEST_LEVEL)
    rules = [
        ("BLOCKED_UNIT_UNCERTAINTY", hits((dq["issue_type"] == "unit_uncertain") & (dq["severity"] == "high"))),
        ("BLOCKED_LABEL_UNCERTAINTY", hits(dq["issue_type"] == "labels_probably_swapped")),
        ("REVIEW_NO_COMBUSTION_RESULTS", hits(dq["issue_type"] == "test_without_results") & has_value),
        ("NOT_ELIGIBLE", meas["quality_flag"].isin(BAD_FLAGS).values),
        ("BLOCKED_HIGH_SEVERITY", hits((dq["severity"] == "high") & not_test_level)),
        ("NOT_ELIGIBLE", (meas["value"].isna() | meas["unit"].isin(["setting", "frames", "index"])).values),
        ("NOT_ELIGIBLE", hits(dq["issue_type"] == "possible_sensor_ceiling")),
        ("NOT_ELIGIBLE", hits(dq["issue_type"] == "coarse_resolution") | (meas["quality_flag"] == "approximate").values),
        ("REVIEW_MEDIUM_SEVERITY", hits((dq["severity"] == "medium") & not_test_level)),
    ]
    meas["scientific_status"] = np.select([r[1] for r in rules], [r[0] for r in rules],
                                          default="PRELIMINARY_ELIGIBLE")
    return meas

MEAS = classify_measurements(pd.read_csv(_find("measurements", ".csv")),
                             pd.read_csv(_find("quality", ".csv")))
ELIG = MEAS[(MEAS["scientific_status"] == "PRELIMINARY_ELIGIBLE") & MEAS["value"].notna()]


# ===== Item 6 part 1: DOCS + TF-IDF + Semantic =====
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_rows = []
for _tid, _g in MEAS.groupby("test_id"):
    _exp = _g["experiment_id"].iloc[0]
    _mats = ", ".join(sorted(_g["material"].dropna().astype(str).unique()))
    _lines = []
    for _, _r in _g.iterrows():
        _val = _r["value"] if pd.notna(_r["value"]) else _r["raw_value"]
        if pd.isna(_val):
            continue
        _unit = _r["unit"] if pd.notna(_r["unit"]) else ""
        _lines.append(f"{str(_r['variable']).replace('_', ' ')} {_val} {_unit}".strip())
    _rows.append({"test_id": _tid, "experiment_id": _exp, "materials": _mats.lower(),
                  "text": f"{_exp} {_tid} material {_mats}. " + ". ".join(_lines)})
DOCS = pd.DataFrame(_rows)
VALID_EXPS = set(DOCS["experiment_id"])

_tfidf = TfidfVectorizer(token_pattern=r"(?u)\b[\w\-\.]+\b", sublinear_tf=True)
_X = _tfidf.fit_transform(DOCS["text"])

def tfidf_ranking(query):
    sims = cosine_similarity(_tfidf.transform([query]), _X).ravel()
    return [int(i) for i in np.argsort(-sims)]

_models = {}
def _sem():
    if "sem" not in _models:
        from sentence_transformers import SentenceTransformer
        m = SentenceTransformer("all-MiniLM-L6-v2")
        emb = m.encode(DOCS["text"].tolist(), normalize_embeddings=True, show_progress_bar=False)
        _models["sem"] = (m, emb)
    return _models["sem"]

def semantic_ranking(query):
    m, emb = _sem()
    q = m.encode([query], normalize_embeddings=True)[0]
    return [int(i) for i in np.argsort(-(emb @ q))]


# ===== Item 6 part 2: Hybrid + Neural + Experiment Filter + Evaluation =====
def rrf_ranking(rankings, k=60):
    scores = {}
    for rk in rankings:
        for pos, i in enumerate(rk[:100]):
            scores[i] = scores.get(i, 0) + 1.0 / (k + pos + 1)
    return sorted(scores, key=scores.get, reverse=True)

def hybrid_search(query, k=5):
    return rrf_ranking([tfidf_ranking(query), semantic_ranking(query)])[:k]

def _ce():
    if "ce" not in _models:
        from sentence_transformers import CrossEncoder
        _models["ce"] = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _models["ce"]

def neural_search(query, k=5, candidates=None, topn=30):
    order = semantic_ranking(query)
    if candidates is not None:
        order = [i for i in order if i in candidates]
    cand = order[:topn]
    if not cand:
        return []
    scores = _ce().predict([(query, DOCS.loc[i, "text"]) for i in cand])
    rank = np.argsort(-np.asarray(scores))
    return [(int(cand[j]), float(scores[j])) for j in rank][:k]

def detect_experiments(query):
    found = [f"PSI-{int(n)}" for n in re.findall(r"PSI[-\s_]?0*(\d+)", query, flags=re.I)]
    return [e for e in dict.fromkeys(found) if e in VALID_EXPS]

_ALL_MATS = sorted({m.lower() for m in MEAS["material"].dropna().astype(str).unique() if len(m) > 3})

def experiment_filtered_neural_search(query, k=5):
    exps = detect_experiments(query)
    cand = None
    if exps:
        cand = set(DOCS.index[DOCS["experiment_id"].isin(exps)])
        hit = [m for m in _ALL_MATS if m in query.lower()]
        if hit:
            sub = {i for i in cand if any(m in DOCS.loc[i, "materials"] for m in hit)}
            if sub:
                cand = sub
    return neural_search(query, k=k, candidates=cand)

EVAL_QUERIES = {
    "PSI-25":  "PSI-25 oxygen and carbon monoxide changes",
    "PSI-69":  "PSI-69 oxygen concentration and burn time",
    "PSI-98":  "PSI-98 combustion results",
    "PSI-102": "PSI-102 weight loss",
    "PSI-26":  "PSI-26 combustion results",
}

def evaluate_engines(k=5):
    engines = {
        "TF-IDF": lambda q: tfidf_ranking(q)[:k],
        "Hybrid": lambda q: hybrid_search(q, k),
        "Neural": lambda q: [i for i, _ in neural_search(q, k)],
        "Neural+ExpFilter": lambda q: [i for i, _ in experiment_filtered_neural_search(q, k)],
    }
    out = []
    for name, fn in engines.items():
        for exp, q in EVAL_QUERIES.items():
            idx = fn(q)
            n_tot = int((DOCS["experiment_id"] == exp).sum())
            hit = sum(DOCS.loc[i, "experiment_id"] == exp for i in idx)
            out.append({"engine": name, "experiment": exp,
                        "P@5": hit / max(len(idx), 1), "R@5": hit / n_tot})
    df = pd.DataFrame(out)
    return df, df.groupby("engine")[["P@5", "R@5"]].mean().round(3)


# ===== Item 7 part 1: Scientific analysis =====
def _pivot(exp, variables):
    sub = ELIG[(ELIG["experiment_id"] == exp) & ELIG["variable"].isin(variables)]
    return sub.pivot_table(index="test_id", columns="variable", values="value", aggfunc="first")

def analyze_psi25():
    spec = {"O2": ("o2_initial_pct_vol", "o2_final_pct_vol", "percentage points"),
            "CO": ("co_initial_ppm", "co_final_ppm", "ppm"),
            "CO2": ("co2_initial_pct_vol", "co2_final_pct_vol", "percentage points")}
    res = {}
    for gas, (a, b, unit) in spec.items():
        p = _pivot("PSI-25", [a, b])
        d = (p[b] - p[a]).dropna() if {a, b} <= set(p.columns) else pd.Series(dtype=float)
        res[gas] = {"paired_measurements": int(len(d)),
                    "mean_change": round(float(d.mean()), 4) if len(d) else None,
                    "median_change": round(float(d.median()), 4) if len(d) else None,
                    "increased": int((d > 0).sum()), "decreased": int((d < 0).sum()),
                    "unchanged": int((d == 0).sum()), "unit": unit}
    return {"analysis": "Paired gas concentration changes", "results": res,
            "interpretation": "Descriptive patterns in available paired measurements only. "
                              "Not universal combustion behavior, not causality, not fire probability."}

def analyze_psi69():
    cols = ["o2_initial_mole_fraction", "burn_time_s"]
    p = _pivot("PSI-69", cols)
    p = p.dropna() if set(cols) <= set(p.columns) else p.iloc[0:0]
    r = float(np.corrcoef(p[cols[0]], p[cols[1]])[0, 1]) if len(p) > 2 else None
    return {"analysis": "Oxygen concentration vs burn time",
            "complete_pairs_used": int(len(p)),
            "pearson_r": round(r, 3) if r is not None else None,
            "interpretation": "Descriptive linear association only. Correlation is not causation; "
                              "pressure, droplet diameter, gas composition and material may also matter. "
                              "Not a validated predictive model."}


# ===== Item 7 part 2: Registry + Unified Query =====
def _status_only(status, note):
    return lambda: {"status": status, "analysis": note}

REGISTRY = {
    "PSI-25": ("AVAILABLE", analyze_psi25),
    "PSI-69": ("AVAILABLE", analyze_psi69),
    "PSI-98": ("LIMITED", _status_only("LIMITED", "Descriptive only; 2 tests; some measurements need review.")),
    "PSI-102": ("LIMITED", _status_only("LIMITED", "Weight-loss-related measurements; few tests.")),
    "PSI-26": ("INSUFFICIENT_DATA", _status_only("INSUFFICIENT_DATA", "No reliable combustion analysis from available measurements.")),
}

def get_scientific_analysis(exp):
    status, fn = REGISTRY[exp]
    out = fn()
    out["status"] = status
    sub = MEAS[MEAS["experiment_id"] == exp]["scientific_status"].value_counts()
    out["data_quality_summary"] = {k: int(v) for k, v in sub.items()}
    return out

_CAUSAL = re.compile(r"\b(cause|causes|caused|causal|prove|proves|proof|predict|prediction|probability|risk)\b", re.I)

def flameguard_unified_query(question, k=5):
    exps = detect_experiments(question)
    hits = experiment_filtered_neural_search(question, k=k)
    evidence = [{"test_id": DOCS.loc[i, "test_id"],
                 "experiment_id": DOCS.loc[i, "experiment_id"],
                 "score": round(s, 4),
                 "snippet": DOCS.loc[i, "text"][:300]} for i, s in hits]
    warnings = ["Evidence claims in evidence.json require human review.",
                "Results are descriptive; evidence completeness is not fire risk."]
    if _CAUSAL.search(question):
        warnings.append("Causal or fire-risk/prediction claims are not supported by this system.")
    if not exps:
        warnings.append("No experiment ID detected; results are not restricted to one experiment.")
    analyses = {e: get_scientific_analysis(e) for e in exps}
    return {"user_query": question, "requested_experiments": exps,
            "retrieved_evidence": evidence, "scientific_analysis": analyses,
            "safety_warnings": warnings}
