
import json
from . import virtual_lab_engine as lab
from . import risk_assessment as ra
from . import scientific_explainer as ex

SCENARIO_KEYS = ["o2_fraction", "pressure_mmhg", "droplet_diameter_mm", "fuel"]

def _clean(sc):
    if not isinstance(sc, dict):
        return None, ["scenario must be an object"]
    missing = [k for k in SCENARIO_KEYS if k not in sc]
    if missing:
        return None, [f"missing field: {k}" for k in missing]
    return {k: sc[k] for k in SCENARIO_KEYS}, []

def _flame_data(run):
    if run.get("status") != "OK":
        return None
    ids = [m["test_id"] for m in run["matched_tests"]]
    sub = lab.LAB[lab.LAB["test_id"].isin(ids)]
    ext = sub["extinction_diameter_mm"].dropna()
    return {"flame_duration_s": round(float(sub["burn_time_s"].median()), 3),
            "initial_droplet_diameter_mm": round(float(sub["droplet_diameter_mm"].median()), 3),
            "extinction_diameter_mm": round(float(ext.median()), 3) if len(ext) else None,
            "source_test_ids": ids,
            "time_series_available": False,
            "note": "Summary values from the nearest NASA tests. Any animation is schematic, not measured frame data."}

def _scenario_block(sc):
    run = lab.run_scenario(**sc)
    return {"inputs": sc, "result": run, "risk_indicator": ra.assess_scenario(**sc),
            "explanation": ex.explain_scenario(**sc), "flame_data": _flame_data(run)}

def lab_response(request):
    if not isinstance(request, dict) or request.get("mode") not in ("single", "compare"):
        return {"status": "BAD_REQUEST", "errors": ["mode must be 'single' or 'compare'"]}
    a, ea = _clean(request.get("scenario_a"))
    if ea:
        return {"status": "BAD_REQUEST", "errors": ["scenario_a: " + e for e in ea]}
    if request["mode"] == "single":
        return {"status": "OK", "mode": "single", "scenario_a": _scenario_block(a),
                "limitations": ex.LIMITATIONS}
    b, eb = _clean(request.get("scenario_b"))
    if eb:
        return {"status": "BAD_REQUEST", "errors": ["scenario_b: " + e for e in eb]}
    return {"status": "OK", "mode": "compare",
            "scenario_a": _scenario_block(a), "scenario_b": _scenario_block(b),
            "comparison": lab.compare_scenarios(a, b),
            "comparison_explanation": ex.explain_comparison(a, b),
            "limitations": ex.LIMITATIONS}

def to_json(obj):
    return json.dumps(obj, indent=2, default=lambda o: o.item() if hasattr(o, "item") else str(o))