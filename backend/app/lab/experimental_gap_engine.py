
from pathlib import Path

import pandas as pd
import numpy as np

DATA_PATH = str(Path(__file__).resolve().parent / "nasa_lab_data.csv")

def detect_experimental_gaps(fuel="Heptane", bins=6):
    if fuel not in ("Heptane", "Methanol"):
        raise ValueError("Unsupported fuel")
    if not 3 <= bins <= 12:
        raise ValueError("bins must be between 3 and 12")

    df = pd.read_csv(DATA_PATH)
    data = df[
        (df["material"] == fuel) &
        (df["composition_ok"] == True)
    ].dropna(subset=[
        "o2_fraction", "pressure_mmhg"
    ]).copy()

    oxygen_edges = np.linspace(
        data.o2_fraction.min(),
        data.o2_fraction.max(), bins + 1
    )
    pressure_edges = np.linspace(
        data.pressure_mmhg.min(),
        data.pressure_mmhg.max(), bins + 1
    )

    counts, _, _ = np.histogram2d(
        data.o2_fraction,
        data.pressure_mmhg,
        bins=[oxygen_edges, pressure_edges]
    )

    cells = []
    for i in range(bins):
        for j in range(bins):
            cells.append({
                "oxygen_min": round(float(oxygen_edges[i]), 5),
                "oxygen_max": round(float(oxygen_edges[i+1]), 5),
                "pressure_min": round(float(pressure_edges[j]), 2),
                "pressure_max": round(float(pressure_edges[j+1]), 2),
                "experiment_count": int(counts[i, j]),
                "status": "GAP" if counts[i, j] == 0 else "COVERED"
            })

    populated = np.argwhere(counts > 0)
    candidates = []

    for i in range(bins):
        for j in range(bins):
            if counts[i, j] > 0:
                continue

            distance = min(
                np.hypot(i-a, j-b)
                for a, b in populated
            )

            candidates.append((float(distance), i, j))

    candidates.sort(key=lambda x: (x[0], x[1], x[2]))

    recommendations = []

    measured = data.dropna(subset=["burn_time_s"]).copy()

    for _, i, j in candidates[:5]:
        o2 = float((oxygen_edges[i] + oxygen_edges[i+1]) / 2)
        pressure = float((pressure_edges[j] + pressure_edges[j+1]) / 2)

        recommendation = {
            "oxygen_fraction": round(o2, 5),
            "pressure_mmhg": round(pressure, 2),
            "status": "EXPLORATORY_RESEARCH_CANDIDATE",
            "selection_reason": "Empty grid cell adjacent to observed experimental coverage",
            "estimated_burn_time_s": None,
            "neighbor_IQR_s": None,
            "prediction_status": "UNAVAILABLE"
        }

        if len(measured) >= 5:
            o2_scale = max(
                measured.o2_fraction.max() - measured.o2_fraction.min(),
                1e-9
            )
            p_scale = max(
                measured.pressure_mmhg.max() - measured.pressure_mmhg.min(),
                1e-9
            )

            distances = np.sqrt(
                ((measured.o2_fraction - o2) / o2_scale)**2 +
                ((measured.pressure_mmhg - pressure) / p_scale)**2
            )

            neighbors = measured.loc[distances.nsmallest(5).index]
            burn = neighbors.burn_time_s

            recommendation["estimated_burn_time_s"] = round(
                float(burn.median()), 2
            )
            recommendation["neighbor_IQR_s"] = round(
                float(burn.quantile(.75) - burn.quantile(.25)), 2
            )
            recommendation["prediction_status"] = (
                "EXPLORATORY_NOT_VALIDATED"
            )

        recommendations.append(recommendation)

    return {
        "fuel": fuel,
        "total_experiments": int(len(data)),
        "total_regions": int(counts.size),
        "covered_regions": int((counts > 0).sum()),
        "gap_regions": int((counts == 0).sum()),
        "coverage_percentage": round(
            float((counts > 0).mean() * 100), 1
        ),
        "coverage_map": cells,
        "next_experiment_candidates": recommendations,
        "limitations": [
            "Gaps refer only to the supplied dataset and selected bins",
            "Candidate ranking is based on proximity, not proven scientific value",
            "Burn-time estimates use only oxygen and pressure",
            "Droplet diameter and gas composition are not controlled",
            "Predictions have not been independently validated",
            "Not an operational spacecraft fire-safety recommendation"
        ]
    }