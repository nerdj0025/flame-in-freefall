import os

import numpy as np
import pandas as pd

LAB = pd.read_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "nasa_lab_data.csv"))
LAB = LAB[LAB["complete_for_lab"] & LAB["composition_ok"]].reset_index(drop=True)

INPUTS = ["o2_fraction", "pressure_mmhg", "droplet_diameter_mm"]
RANGES = {c: {"min": float(LAB[c].min()), "max": float(LAB[c].max())} for c in INPUTS}
SPAN = {c: RANGES[c]["max"] - RANGES[c]["min"] for c in INPUTS}
FUELS = sorted(LAB["material"].dropna().unique())

# Ø¹ØªØ¨Ø§Øª Ù…Ø­Ø§ÙØ¸Ø© Ø§Ø®ØªØ±Ù†Ø§Ù‡Ø§ Ù†Ø­Ù†ØŒ Ù…Ø´ Ù…Ù† NASA | Conservative thresholds chosen by us, not from NASA
CLOSE, APPROX = 0.05, 0.15


def validate_inputs(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel):
    errors = []
    vals = {"o2_fraction": o2_fraction, "pressure_mmhg": pressure_mmhg,
            "droplet_diameter_mm": droplet_diameter_mm}
    for c, v in vals.items():
        try:
            v = float(v)
        except (TypeError, ValueError):
            errors.append(f"{c} must be a number")
            continue
        if not (RANGES[c]["min"] <= v <= RANGES[c]["max"]):
            errors.append(f"{c}={v} is outside the supported range "
                          f"[{RANGES[c]['min']}, {RANGES[c]['max']}]")
    if fuel not in FUELS:
        errors.append(f"fuel '{fuel}' is not supported; choose one of {FUELS}")
    return errors


def run_scenario(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel, k=5):
    errors = validate_inputs(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel)
    if errors:
        return {"status": "REJECTED", "errors": errors,
                "allowed_ranges": RANGES, "supported_fuels": FUELS}

    x = {"o2_fraction": float(o2_fraction), "pressure_mmhg": float(pressure_mmhg),
         "droplet_diameter_mm": float(droplet_diameter_mm)}
    sub = LAB[LAB["material"] == fuel].copy()
    d = 0
    for c in INPUTS:
        d = d + ((sub[c] - x[c]) / SPAN[c]) ** 2
    sub["distance"] = np.sqrt(d)
    near = sub.sort_values("distance").head(k)

    nearest = float(near["distance"].iloc[0])
    farthest = float(near["distance"].iloc[-1])
    level = ("CLOSE_MATCH" if nearest <= CLOSE
             else "APPROXIMATE_MATCH" if nearest <= APPROX else "WEAK_MATCH")

    ext = near["extinction_diameter_mm"].dropna()
    summary = {
        "tests_used": int(len(near)),
        "burn_time_s": {"median": round(float(near["burn_time_s"].median()), 3),
                        "min": round(float(near["burn_time_s"].min()), 3),
                        "max": round(float(near["burn_time_s"].max()), 3)},
        "extinction_diameter_mm_median": (round(float(ext.median()), 3) if len(ext) else None),
    }
    matches = [{"test_id": r["test_id"], "distance": round(float(r["distance"]), 4),
                "o2_fraction": float(r["o2_fraction"]), "pressure_mmhg": float(r["pressure_mmhg"]),
                "droplet_diameter_mm": float(r["droplet_diameter_mm"]),
                "burn_time_s": float(r["burn_time_s"])} for _, r in near.iterrows()]

    warnings = ["Observed values from the nearest NASA tests. Not a prediction or a physical simulation."]
    if level == "WEAK_MATCH":
        warnings.append("No close NASA test exists for these inputs; treat the result as weakly supported.")
    elif farthest > APPROX:
        warnings.append("Some of the matched tests are far from the requested inputs.")

    return {"status": "OK", "inputs": {**x, "fuel": fuel}, "support_level": level,
            "nearest_distance": round(nearest, 4), "summary": summary,
            "matched_tests": matches, "warnings": warnings}


def compare_scenarios(a, b, k=5):
    ra, rb = run_scenario(**a, k=k), run_scenario(**b, k=k)
    if ra["status"] != "OK" or rb["status"] != "OK":
        return {"status": "REJECTED", "scenario_a": ra, "scenario_b": rb}

    keys = ["o2_fraction", "pressure_mmhg", "droplet_diameter_mm", "fuel"]
    differing = [c for c in keys if a[c] != b[c]]
    ma = ra["summary"]["burn_time_s"]["median"]
    mb = rb["summary"]["burn_time_s"]["median"]

    warnings = ["Descriptive comparison only. No validated causal conclusion is claimed."]
    if "fuel" in differing:
        warnings.append("The fuel differs between scenarios, so the comparison is not like-for-like.")
    if len(differing) > 1:
        warnings.append("More than one input differs, so the difference cannot be attributed to a single variable.")
    for name, r in (("A", ra), ("B", rb)):
        if r["support_level"] == "WEAK_MATCH":
            warnings.append(f"Scenario {name} has only a weak match in the NASA data.")

    return {"status": "OK", "inputs_that_differ": differing,
            "burn_time_median_a": ma, "burn_time_median_b": mb,
            "difference_b_minus_a": round(mb - ma, 3),
            "scenario_a": ra, "scenario_b": rb, "warnings": warnings}