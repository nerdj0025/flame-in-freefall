
from pathlib import Path
import pandas as pd
import numpy as np

DATA_PATH = Path(__file__).resolve().parent / "nasa_lab_data.csv"

CONDITIONS = [
    "o2_fraction",
    "pressure_mmhg",
    "droplet_diameter_mm",
    "co2_fraction",
    "he_fraction",
    "n2_fraction"
]

TOLERANCES = {
    "o2_fraction": 0.005,
    "pressure_mmhg": 25.0,
    "droplet_diameter_mm": 0.20,
    "co2_fraction": 0.005,
    "he_fraction": 0.005,
    "n2_fraction": 0.015
}

def discover_unusual_pairs(
    fuel=None,
    min_burn_difference_s=5.0,
    min_burn_ratio=1.5,
    max_results=20
):
    df = pd.read_csv(DATA_PATH)

    required = CONDITIONS + [
        "test_id", "material", "burn_time_s"
    ]

    data = df.dropna(subset=required).copy()

    data = data[
        (data["burn_time_s"] > 0) &
        (data["pressure_mmhg"] > 0) &
        (data["droplet_diameter_mm"] > 0) &
        (data["composition_ok"] == True)
    ]

    if fuel is not None:
        data = data[
            data["material"].str.lower() == fuel.lower()
        ]

    candidates = []
    evaluated_pairs = 0
    matched_pairs = 0

    for material, group in data.groupby("material"):
        records = group.to_dict("records")

        for i in range(len(records)):
            for j in range(i + 1, len(records)):

                a = records[i]
                b = records[j]

                evaluated_pairs += 1

                differences = {
                    col: abs(float(a[col]) - float(b[col]))
                    for col in CONDITIONS
                }

                if not all(
                    differences[col] <= TOLERANCES[col] + 1e-9
                    for col in CONDITIONS
                ):
                    continue

                matched_pairs += 1

                t1 = float(a["burn_time_s"])
                t2 = float(b["burn_time_s"])

                difference = abs(t1 - t2)
                ratio = max(t1, t2) / min(t1, t2)

                if (
                    difference < min_burn_difference_s
                    or ratio < min_burn_ratio
                ):
                    continue

                normalized_distance = float(np.sqrt(
                    sum(
                        (differences[col] / TOLERANCES[col]) ** 2
                        for col in CONDITIONS
                    )
                ))

                missing_extinction = int(
                    pd.isna(a.get("extinction_diameter_mm"))
                ) + int(
                    pd.isna(b.get("extinction_diameter_mm"))
                )

                candidates.append({
                    "fuel": material,
                    "test_a": str(a["test_id"]),
                    "test_b": str(b["test_id"]),
                    "burn_time_a_s": t1,
                    "burn_time_b_s": t2,
                    "burn_time_difference_s": round(difference, 4),
                    "burn_time_ratio": round(ratio, 4),
                    "normalized_condition_distance": round(
                        normalized_distance, 4
                    ),
                    "condition_differences": differences,
                    "missing_extinction_measurements": missing_extinction,
                    "classification": "RESEARCH_CANDIDATE",
                    "causal_discovery_confirmed": False
                })

    candidates.sort(
        key=lambda x: (
            -x["burn_time_difference_s"],
            x["normalized_condition_distance"]
        )
    )

    return {
        "status": "SUCCESS",
        "source": "NASA PSI-69",
        "method": "CONDITION_MATCHED_PAIR_SCREENING",
        "evaluated_pairs": evaluated_pairs,
        "condition_matched_pairs": matched_pairs,
        "total_candidates": len(candidates),
        "candidates": candidates[:max_results],
        "thresholds": {
            "min_burn_difference_s": min_burn_difference_s,
            "min_burn_ratio": min_burn_ratio,
            "matching_tolerances": TOLERANCES
        },
        "scientific_limitations": [
            "Candidate screening is exploratory.",
            "Thresholds are heuristic, not statistically calibrated.",
            "Matched recorded conditions do not prove identical protocols.",
            "Pairs may share experiments and are not independent.",
            "Unrecorded confounders may explain differences.",
            "No causal or physical discovery is confirmed."
        ]
    }