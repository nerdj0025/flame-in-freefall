from pathlib import Path

import pandas as pd
import numpy as np

DATA_PATH = str(Path(__file__).resolve().parent / "nasa_lab_data.csv")

CONDITIONS = [
    "o2_fraction",
    "pressure_mmhg",
    "droplet_diameter_mm",
    "co2_fraction",
    "he_fraction",
    "n2_fraction"
]

def analyze_scenario(
    fuel,
    o2_fraction,
    pressure_mmhg,
    droplet_diameter_mm,
    co2_fraction=0.0,
    he_fraction=0.0,
    n2_fraction=None
):
    if n2_fraction is None:
        n2_fraction = (
            1.0 - o2_fraction
            - co2_fraction - he_fraction
        )

    inputs = {
        "o2_fraction": float(o2_fraction),
        "pressure_mmhg": float(pressure_mmhg),
        "droplet_diameter_mm": float(droplet_diameter_mm),
        "co2_fraction": float(co2_fraction),
        "he_fraction": float(he_fraction),
        "n2_fraction": float(n2_fraction)
    }

    if (
        not all(np.isfinite(v) for v in inputs.values())
        or pressure_mmhg <= 0
        or droplet_diameter_mm <= 0
        or any(
            inputs[k] < 0 or inputs[k] > 1
            for k in [
                "o2_fraction", "co2_fraction",
                "he_fraction", "n2_fraction"
            ]
        )
        or abs(
            sum(inputs[k] for k in [
                "o2_fraction", "co2_fraction",
                "he_fraction", "n2_fraction"
            ]) - 1.0
        ) > 0.015
    ):
        raise ValueError("Invalid experimental conditions")

    df = pd.read_csv(DATA_PATH)

    data = df[
        (df["material"].str.lower() == fuel.lower()) &
        df["composition_ok"].eq(True)
    ].dropna(
        subset=CONDITIONS + ["burn_time_s"]
    ).copy()

    data = data[
        (data["burn_time_s"] >= 0) &
        (data["pressure_mmhg"] > 0) &
        (data["droplet_diameter_mm"] > 0)
    ]

    # Exploratory tolerances, not validated
    # physical equivalence thresholds.
    tolerances = {
        "o2_fraction": 0.005,
        "pressure_mmhg": 25.0,
        "droplet_diameter_mm": 0.20,
        "co2_fraction": 0.005,
        "he_fraction": 0.005,
        "n2_fraction": 0.015
    }

    mask = pd.Series(True, index=data.index)

    for col, tolerance in tolerances.items():
        mask &= (
            data[col].sub(inputs[col]).abs()
            <= tolerance + 1e-9
        )

    matched = data.loc[mask].copy()
    matched = matched.sort_values("burn_time_s")

    times = matched["burn_time_s"].to_numpy()
    n = len(times)

    stats = {
        "sample_size": n,
        "median_burn_time_s": None,
        "mean_burn_time_s": None,
        "std_burn_time_s": None,
        "range_burn_time_s": None,
        "bootstrap_median_interval_95_s": None
    }

    flags = []

    if n < 5:
        flags.append("INSUFFICIENT_REPLICATION")
    elif n < 10:
        flags.append("SMALL_SAMPLE")

    if n:
        stats["median_burn_time_s"] = float(
            np.median(times)
        )
        stats["mean_burn_time_s"] = float(
            np.mean(times)
        )
        stats["range_burn_time_s"] = float(
            np.ptp(times)
        )

    if n >= 2:
        stats["std_burn_time_s"] = float(
            np.std(times, ddof=1)
        )

        median = stats["median_burn_time_s"]
        spread = stats["range_burn_time_s"]

        if median > 0 and spread / median > 0.5:
            flags.append("HIGH_OUTCOME_VARIABILITY")

    if n >= 5:
        rng = np.random.default_rng(42)

        samples = rng.choice(
            times,
            size=(3000, n),
            replace=True
        )

        medians = np.median(samples, axis=1)

        stats["bootstrap_median_interval_95_s"] = [
            float(x) for x in np.percentile(
                medians, [2.5, 97.5]
            )
        ]

    missing_extinction = int(
        matched["extinction_diameter_mm"]
        .isna().sum()
    )

    if missing_extinction:
        flags.append("MISSING_EXTINCTION_MEASUREMENTS")

    # Examine individual outcome deviations.
    # These are investigation candidates,
    # not confirmed anomalies.
    candidates = []

    if n >= 5:
        median = float(np.median(times))
        mad = float(
            np.median(np.abs(times - median))
        )

        for _, row in matched.iterrows():
            deviation = abs(
                float(row["burn_time_s"]) - median
            )

            if mad > 0:
                robust_deviation = (
                    0.6745 * deviation / mad
                )
            else:
                robust_deviation = None

            if (
                robust_deviation is not None
                and robust_deviation > 2.5
            ):
                candidates.append({
                    "test_id": row["test_id"],
                    "burn_time_s": float(
                        row["burn_time_s"]
                    ),
                    "robust_deviation": float(
                        robust_deviation
                    ),
                    "status": "REQUIRES_INVESTIGATION"
                })

    if n < 5:
        readiness = "INSUFFICIENT"
    elif flags:
        readiness = "LIMITED"
    else:
        readiness = "PRELIMINARY"

    return {
        "status": "SUCCESS",
        "source": "NASA PSI-69",
        "inputs": {
            "fuel": fuel,
            **inputs
        },
        "matching_tolerances": tolerances,
        "statistics": stats,
        "discovery_candidates": candidates,
        "matched_test_ids": matched[
            "test_id"
        ].tolist(),
        "evidence_readiness": readiness,
        "evidence_flags": flags,
        "missing_extinction_count": missing_extinction,
        "causal_claim_supported": False,
        "mission_evidence": {
            "research_use": (
                "Exploratory assessment of recorded "
                "microgravity droplet combustion results."
            ),
            "safety_certification_supported": False,
            "recommended_next_step": (
                "Collect repeated controlled experiments "
                "and document all relevant conditions "
                "and measurement protocols."
            )
        },
        "limitations": [
            "Matching tolerances are exploratory.",
            "Bootstrap assumes comparable independent observations.",
            "Unrecorded conditions may explain differences.",
            "Readiness labels are heuristic, not NASA-approved.",
            "Not a validated spacecraft fire-risk model."
        ]
    }