
from pathlib import Path
import pandas as pd
import numpy as np

DATA_PATH = Path(__file__).resolve().parent / "nasa_lab_data.csv"

def recommend_conditions(fuel="Heptane", top_n=5):
    df = pd.read_csv(DATA_PATH)

    required = [
        "material", "o2_fraction", "pressure_mmhg",
        "droplet_diameter_mm", "co2_fraction",
        "he_fraction", "n2_fraction", "burn_time_s"
    ]

    data = df.dropna(subset=required).copy()

    data = data[
        (data["material"].str.lower() == fuel.lower()) &
        (data["burn_time_s"] > 0) &
        (data["pressure_mmhg"] > 0) &
        (data["droplet_diameter_mm"] > 0) &
        (data["composition_ok"] == True)
    ].copy()

    if data.empty:
        return {
            "status": "NO_EVIDENCE",
            "fuel": fuel,
            "recommendations": [],
            "spacecraft_safety_certification_supported": False
        }

    # Group similar recorded conditions into comparison bands.
    data["oxygen_band"] = (
        data["o2_fraction"] / 0.01
    ).round().astype(int)

    data["pressure_band"] = (
        data["pressure_mmhg"] / 50
    ).round().astype(int)

    data["droplet_band"] = (
        data["droplet_diameter_mm"] / 0.25
    ).round().astype(int)

    data["co2_band"] = (
        data["co2_fraction"] / 0.01
    ).round().astype(int)

    data["he_band"] = (
        data["he_fraction"] / 0.01
    ).round().astype(int)

    data["n2_band"] = (
        data["n2_fraction"] / 0.01
    ).round().astype(int)

    group_cols = [
        "oxygen_band", "pressure_band", "droplet_band",
        "co2_band", "he_band", "n2_band"
    ]

    recommendations = []

    for _, group in data.groupby(group_cols):
        n = len(group)

        # At least 3 observations to display a candidate.
        if n < 3:
            continue

        median_burn = float(group["burn_time_s"].median())
        spread = float(
            group["burn_time_s"].max() -
            group["burn_time_s"].min()
        )

        extinction_count = int(
            group["extinction_diameter_mm"].notna().sum()
        )

        if n >= 5 and spread <= median_burn * 0.3:
            evidence = "PRELIMINARY"
        else:
            evidence = "LIMITED"

        recommendations.append({
            "fuel": fuel,
            "oxygen_fraction": round(
                float(group["o2_fraction"].median()), 4
            ),
            "pressure_mmhg": round(
                float(group["pressure_mmhg"].median()), 2
            ),
            "droplet_diameter_mm": round(
                float(group["droplet_diameter_mm"].median()), 3
            ),
            "co2_fraction": round(
                float(group["co2_fraction"].median()), 4
            ),
            "he_fraction": round(
                float(group["he_fraction"].median()), 4
            ),
            "n2_fraction": round(
                float(group["n2_fraction"].median()), 4
            ),
            "matched_experiments": n,
            "median_burn_time_s": round(median_burn, 3),
            "burn_time_range_s": round(spread, 3),
            "extinction_measurements": extinction_count,
            "evidence_readiness": evidence,
            "interpretation":
                "Observed shorter droplet burn duration "
                "is not equivalent to lower spacecraft fire risk."
        })

    # Rank by observed median duration, not certified safety.
    recommendations.sort(
        key=lambda x: (
            x["median_burn_time_s"],
            -x["matched_experiments"],
            x["burn_time_range_s"]
        )
    )

    return {
        "status": "SUCCESS",
        "fuel": fuel,
        "objective": "LOWER_OBSERVED_BURN_DURATION",
        "total_candidate_groups": len(recommendations),
        "recommendations": recommendations[:top_n],
        "ranking_method": "EXPLORATORY_OBSERVATIONAL",
        "limitations": [
            "Not a spacecraft safety optimization model.",
            "Shorter droplet burn duration does not prove lower fire risk.",
            "Condition bands may contain different experiments.",
            "Fuel, oxygen, pressure and gas effects are not causal estimates.",
            "Experimental findings may not transfer to spacecraft cabins."
        ],
        "spacecraft_safety_certification_supported": False,
        "operational_safety_recommendation": False
    }