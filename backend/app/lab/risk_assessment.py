
import numpy as np
from . import virtual_lab_engine as lab

# Ø¹ØªØ¨Ø§Øª Ù†Ø³Ø¨ÙŠØ© Ù…Ù† ØªÙˆØ²ÙŠØ¹ Ø¨ÙŠØ§Ù†Ø§Øª NASA Ù„ÙƒÙ„ ÙˆÙ‚ÙˆØ¯ | Relative thresholds from the NASA data per fuel
_Q = {}
for _fuel, _g in lab.LAB.groupby("material"):
    _Q[_fuel] = (float(_g["burn_time_s"].quantile(1 / 3)),
                 float(_g["burn_time_s"].quantile(2 / 3)))

def _factors(fuel):
    g = lab.LAB[lab.LAB["material"] == fuel]
    out = []
    for c in lab.INPUTS:
        r = g[c].corr(g["burn_time_s"], method="spearman")
        if np.isnan(r):
            continue
        direction = "longer" if r > 0 else "shorter"
        strength = "strong" if abs(r) >= 0.6 else "moderate" if abs(r) >= 0.3 else "weak"
        out.append({"variable": c, "spearman_r": round(float(r), 3),
                    "description": f"{strength} association: higher {c} goes with {direction} burn time "
                                   f"in the NASA {fuel} tests"})
    return sorted(out, key=lambda d: -abs(d["spearman_r"]))

def assess_scenario(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel, k=5):
    res = lab.run_scenario(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel, k)
    base = {"indicator": "Relative flame persistence (NOT a fire-risk probability)",
            "fire_risk_score": "not calculated"}
    if res["status"] != "OK":
        return {**base, "level": "NOT_ASSESSED", "reason": "inputs rejected", "errors": res["errors"]}
    if res["support_level"] == "WEAK_MATCH":
        return {**base, "level": "NOT_ASSESSED",
                "reason": "No close NASA test for these inputs; not enough evidence to classify.",
                "support_level": res["support_level"]}

    med = res["summary"]["burn_time_s"]["median"]
    lo, hi = _Q[fuel]
    level = "LOW" if med <= lo else "HIGH" if med >= hi else "MEDIUM"
    return {**base, "level": level, "support_level": res["support_level"],
            "basis": {"matched_median_burn_time_s": med,
                      "fuel_low_threshold_s": round(lo, 2), "fuel_high_threshold_s": round(hi, 2),
                      "rule": "LOW if median <= 33rd percentile, HIGH if >= 67th percentile of NASA burn times for this fuel"},
            "influencing_factors": _factors(fuel),
            "warnings": ["Relative to the NASA tests in this dataset only.",
                         "Factors are descriptive associations, not proven causes.",
                         "Not a validated fire-risk model."]}