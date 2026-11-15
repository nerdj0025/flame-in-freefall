from pathlib import Path

import pandas as pd
import numpy as np

DATA_PATH = str(Path(__file__).resolve().parent / "nasa_lab_data.csv")

BASE_TOLERANCES = {
    "o2_fraction": 0.005,
    "pressure_mmhg": 25.0,
    "droplet_diameter_mm": 0.20,
    "co2_fraction": 0.005,
    "he_fraction": 0.005,
    "n2_fraction": 0.015
}

def validate_scenario(
    fuel,
    o2_fraction,
    pressure_mmhg,
    droplet_diameter_mm,
    co2_fraction=0.0,
    he_fraction=0.0,
    n2_fraction=None
):
    from .dynamic_intelligence_engine import analyze_scenario

    baseline = analyze_scenario(
        fuel=fuel,
        o2_fraction=o2_fraction,
        pressure_mmhg=pressure_mmhg,
        droplet_diameter_mm=droplet_diameter_mm,
        co2_fraction=co2_fraction,
        he_fraction=he_fraction,
        n2_fraction=n2_fraction
    )

    inputs = baseline["inputs"]
    df = pd.read_csv(DATA_PATH)

    modes = {
        "STRICT": 0.5,
        "BASELINE": 1.0,
        "RELAXED": 1.75
    }

    results = {}

    for mode, factor in modes.items():

        mask = (
            df["material"].str.lower().eq(fuel.lower()) &
            df["composition_ok"].eq(True) &
            df["burn_time_s"].notna() &
            (df["burn_time_s"] >= 0)
        )

        for col, tolerance in BASE_TOLERANCES.items():
            mask &= (
                df[col].sub(inputs[col]).abs()
                <= tolerance * factor + 1e-9
            )

        matched = df.loc[mask]
        times = matched["burn_time_s"].to_numpy()

        results[mode] = {
            "sample_size": len(times),
            "test_ids": matched["test_id"].tolist(),
            "median_burn_time_s": (
                float(np.median(times))
                if len(times) else None
            ),
            "range_burn_time_s": (
                float(np.ptp(times))
                if len(times) else None
            )
        }

    warnings = []

    if results["BASELINE"]["sample_size"] < 5:
        warnings.append("INSUFFICIENT_BASELINE_EVIDENCE")

    counts = [
        results[m]["sample_size"]
        for m in modes
    ]

    if min(counts) == 0:
        warnings.append("EMPTY_MATCHING_WINDOW")

    ranges = [
        results[m]["range_burn_time_s"]
        for m in modes
    ]

    if all(x is not None for x in ranges):
        if max(ranges) - min(ranges) < 1e-6:
            warnings.append(
                "RANGE_STABLE_BUT_NOT_CAUSAL_EVIDENCE"
            )
        else:
            warnings.append(
                "OUTCOME_RANGE_SENSITIVE_TO_MATCHING"
            )

    medians = [
        results[m]["median_burn_time_s"]
        for m in modes
    ]

    if all(x is not None for x in medians):
        if max(medians) - min(medians) > 2:
            warnings.append(
                "MEDIAN_SENSITIVE_TO_MATCHING"
            )

    return {
        "status": "SUCCESS",
        "source": "NASA PSI-69",
        "inputs": inputs,
        "matching_modes": results,
        "validation_warnings": warnings,
        "scientific_conclusion": (
            "Exploratory sensitivity analysis only. "
            "Persistence of outcome spread does not "
            "establish causality or a new physical effect."
        ),
        "validated_physical_discovery": False
    }