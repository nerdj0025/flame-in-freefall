# Flame in Freefall - Lab update (FlameGuard X Virtual Lab). Run from INSIDE the project folder
# (the one that contains package.json and the backend folder).
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'package.json'))) {
  Write-Host 'ERROR: package.json not found. cd into the flame-in-freefall folder first.' -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $root 'backend/app/main.py'))) {
  Write-Host 'ERROR: backend/app/main.py not found. Run this from the folder that contains the backend folder.' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
function W($rel, $content) {
  $path = Join-Path $root $rel
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, ($content -replace "`r?`n", "`r`n"), $utf8)
  Write-Host ("wrote " + $rel)
}
W 'backend/app/lab/__init__.py' @'

'@
W 'backend/app/lab/combustion_explanation_engine.py' @'

def explain_combustion(
    fuel="Heptane",
    o2_fraction=0.21,
    pressure_mmhg=760,
    droplet_diameter_mm=3.0
):
    if fuel not in ["Heptane", "Methanol"]:
        raise ValueError("Unsupported fuel")

    if not (0 < o2_fraction <= 1):
        raise ValueError("Invalid oxygen fraction")

    if pressure_mmhg <= 0 or droplet_diameter_mm <= 0:
        raise ValueError("Pressure and diameter must be positive")

    oxygen_percent = round(o2_fraction * 100, 2)

    oxygen_partial_pressure = round(
        o2_fraction * pressure_mmhg, 2
    )

    reference_o2_pressure = 0.21 * 760

    if oxygen_partial_pressure > reference_o2_pressure * 1.1:
        oxygen_explanation = (
            "Oxygen partial pressure is higher than the "
            "21% oxygen, 760 mmHg reference. This may support "
            "stronger oxidation under suitable conditions."
        )
    elif oxygen_partial_pressure < reference_o2_pressure * 0.9:
        oxygen_explanation = (
            "Oxygen partial pressure is lower than the "
            "reference. This may limit oxidation or influence "
            "flame extinction, depending on the experiment."
        )
    else:
        oxygen_explanation = (
            "Oxygen partial pressure is near the reference. "
            "Other conditions can still significantly affect combustion."
        )

    return {
        "fuel": fuel,
        "oxygen_percentage": oxygen_percent,
        "pressure_mmhg": pressure_mmhg,
        "oxygen_partial_pressure_mmhg": oxygen_partial_pressure,
        "droplet_diameter_mm": droplet_diameter_mm,

        "scientific_explanation": {
            "fuel_role": (
                f"{fuel} is a combustible fuel. Its vapor can "
                "react with oxygen when suitable ignition and "
                "mixing conditions are present."
            ),

            "oxygen_pressure_interaction": oxygen_explanation,

            "pressure_role": (
                "Total pressure affects oxygen partial pressure, "
                "gas transport, reaction kinetics and flame behavior."
            ),

            "droplet_role": (
                "Droplet diameter influences fuel availability "
                "and burning duration. Larger droplets may burn "
                "longer under otherwise comparable conditions."
            ),

            "microgravity_role": (
                "In microgravity, buoyancy-driven convection is "
                "greatly reduced. Diffusion and other transport "
                "processes become especially important."
            )
        },

        "why_review_before_repeating": (
            "Similar experimental conditions may reproduce "
            "previously observed combustion behavior. Review "
            "the experimental evidence and ignition conditions "
            "before repeating the scenario. These variables "
            "alone cannot establish whether ignition will occur."
        ),

        "evidence_level": "GENERAL_SCIENTIFIC_EXPLANATION",

        "limitations": [
            "This is a physics-informed explanation, not a trained AI model.",
            "It does not predict ignition or operational fire risk.",
            "Actual combustion depends on ignition, mixing, "
            "fuel properties and other experimental conditions.",
            "NASA experimental evidence must be evaluated separately."
        ]
    }
'@
W 'backend/app/lab/crime_scene_engine.py' @'

from .detective_api import detective_response
from .next_experiment_engine import recommend_next_experiment

def investigate_case():
    scenario_a = {
        "o2_fraction": 0.21,
        "pressure_mmhg": 760,
        "droplet_diameter_mm": 1.8,
        "fuel": "Methanol"
    }

    scenario_b = {
        **scenario_a,
        "o2_fraction": 0.30
    }

    investigation = detective_response(
        scenario_a, scenario_b
    )

    if investigation["status"] != "OK":
        return {
            "status": "REJECTED",
            "reason": "Scientific investigation failed.",
            "details": investigation
        }

    next_experiment = recommend_next_experiment(
        investigation
    )

    return {
        "status": "OK",
        "case_id": "FGX-001",
        "case_title": "The Oxygen Paradox",
        "case_type": "Scientific Evidence Investigation",
        "nasa_experiment": "PSI-69",
        "case_question": (
            "Did increasing oxygen concentration "
            "cause the observed difference "
            "in droplet burn time?"
        ),
        "scenario_a": scenario_a,
        "scenario_b": scenario_b,
        "investigation": investigation,
        "next_experiment": next_experiment,
        "case_status": "UNRESOLVED",
        "final_message": (
            "The NASA reference tests show different "
            "burn times, but the matched experimental "
            "conditions are not sufficiently controlled "
            "to establish a causal oxygen effect."
        )
    }
'@
W 'backend/app/lab/detective_api.py' @'

from . import scientific_detective as detective
from . import virtual_lab_engine as lab

def detective_response(scenario_a, scenario_b):
    result = detective.investigate(
        scenario_a, scenario_b
    )

    if result["status"] != "OK":
        return result

    comparison = lab.compare_scenarios(
        scenario_a, scenario_b
    )

    audit = detective.audit_actual_evidence(
        comparison
    )

    result["actual_evidence_audit"] = audit

    result["warnings"] = list(dict.fromkeys(
        result["warnings"] + audit["alerts"]
    ))

    result["causal_claim_supported"] = False

    result["scientific_conclusion"] = (
        "The NASA reference observations provide "
        "descriptive evidence only. The comparison "
        "does not establish a causal effect."
    )

    return result
'@
W 'backend/app/lab/discovery_engine_v2.py' @'

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
'@
W 'backend/app/lab/dynamic_intelligence_engine.py' @'
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
'@
W 'backend/app/lab/experimental_gap_engine.py' @'

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
'@
W 'backend/app/lab/lab_api.py' @'

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
'@
W 'backend/app/lab/mission_research_advisor.py' @'

from .dynamic_intelligence_engine import analyze_scenario
from .scientific_validation_engine import validate_scenario

RESEARCH_QUESTIONS = {
    "burn_duration": "Burn Duration Consistency",
    "extinction": "Flame Extinction Evidence",
    "oxygen_effect": "Oxygen Effect Investigation"
}

def advise_research(
    fuel,
    o2_fraction,
    pressure_mmhg,
    droplet_diameter_mm,
    research_question="burn_duration",
    co2_fraction=0.0,
    he_fraction=0.0,
    n2_fraction=None
):
    if research_question not in RESEARCH_QUESTIONS:
        raise ValueError(
            "Unsupported research question. Choose: "
            + ", ".join(RESEARCH_QUESTIONS)
        )

    params = {
        "fuel": fuel,
        "o2_fraction": o2_fraction,
        "pressure_mmhg": pressure_mmhg,
        "droplet_diameter_mm": droplet_diameter_mm,
        "co2_fraction": co2_fraction,
        "he_fraction": he_fraction,
        "n2_fraction": n2_fraction
    }

    dynamic = analyze_scenario(**params)
    validation = validate_scenario(**params)

    stats = dynamic["statistics"]
    n = stats["sample_size"]
    flags = dynamic["evidence_flags"]
    warnings = validation["validation_warnings"]

    missing_extinction = dynamic["missing_extinction_count"]
    available_extinction = n - missing_extinction

    recommendations = []
    limitations = []

    if n < 5:
        recommendations.append(
            "Collect additional comparable experiments "
            "before drawing conclusions."
        )

    if "HIGH_OUTCOME_VARIABILITY" in flags:
        recommendations.append(
            "Repeat controlled trials and investigate "
            "unrecorded experimental conditions."
        )

    if "MEDIAN_SENSITIVE_TO_MATCHING" in warnings:
        recommendations.append(
            "Report matching-window sensitivity "
            "alongside the main result."
        )

    if research_question == "extinction":
        if available_extinction < 5:
            recommendations.append(
                "Collect more extinction diameter "
                "measurements under matched conditions."
            )
            limitations.append(
                "Insufficient measured extinction outcomes."
            )

    elif research_question == "oxygen_effect":
        recommendations.append(
            "Design a controlled oxygen comparison "
            "while holding fuel, pressure, droplet size "
            "and diluent composition fixed."
        )
        limitations.append(
            "A single matched scenario cannot establish "
            "the causal effect of oxygen."
        )

    else:
        recommendations.append(
            "Compare burn-duration distributions "
            "across repeated matched experiments."
        )

    if not recommendations:
        recommendations.append(
            "Expand and independently verify "
            "the experimental evidence."
        )

    readiness = dynamic["evidence_readiness"]

    if research_question == "extinction" and available_extinction < 5:
        readiness = "INSUFFICIENT"

    if research_question == "oxygen_effect":
        readiness = "INSUFFICIENT"

    return {
        "status": "SUCCESS",
        "source": "NASA PSI-69",
        "research_question": research_question,
        "research_question_label":
            RESEARCH_QUESTIONS[research_question],
        "matched_experiments": n,
        "available_extinction_measurements":
            available_extinction,
        "evidence_readiness": readiness,
        "evidence_flags": flags,
        "validation_warnings": warnings,
        "recommended_research_actions":
            list(dict.fromkeys(recommendations)),
        "limitations": limitations + [
            "Research readiness is heuristic.",
            "This is not a validated spacecraft fire-risk model.",
            "No operational spacecraft safety decision "
            "is supported by this assessment."
        ],
        "spacecraft_safety_certification_supported": False,
        "causal_claim_supported": False
    }
'@
W 'backend/app/lab/nasa_lab_data.csv' @'
test_id,experiment_id,material,o2_fraction,pressure_mmhg,droplet_diameter_mm,co2_fraction,he_fraction,n2_fraction,burn_time_s,extinction_diameter_mm,composition_sum,composition_ok,complete_for_lab
PSI-69-T001,PSI-69,Methanol,0.21,757.7,1.69,0.0,0.0,0.79,4.3,0.89,1.0,True,True
PSI-69-T002,PSI-69,Methanol,0.21,762.0,1.86,0.0,0.0,0.79,5.0,0.94,1.0,True,True
PSI-69-T003,PSI-69,Methanol,0.21,764.2,1.61,0.0,0.0,0.79,3.2,0.92,1.0,True,True
PSI-69-T004,PSI-69,Methanol,0.21,760.0,2.06,0.0,0.0,0.79,7.64,,1.0,True,True
PSI-69-T005,PSI-69,Methanol,0.21,760.0,1.92,0.0,0.0,0.79,6.34,0.81,1.0,True,True
PSI-69-T006,PSI-69,Methanol,0.21,760.0,2.54,0.0,0.0,0.79,9.6,1.53,1.0,True,True
PSI-69-T007,PSI-69,Heptane,0.21,761.3,1.87,0.0,0.0,0.79,5.3,,1.0,True,True
PSI-69-T008,PSI-69,Heptane,0.21,762.4,2.95,0.0,0.0,0.79,14.8,,1.0,True,True
PSI-69-T010,PSI-69,Methanol,0.21,2319.7,3.86,0.7,0.0,0.09,13.6,,1.0,True,True
PSI-69-T011,PSI-69,Methanol,0.21,2318.8,3.03,0.7,0.0,0.09,16.5,,1.0,True,True
PSI-69-T012,PSI-69,Heptane,0.21,2319.9,2.74,0.7,0.0,0.09,,,1.0,True,False
PSI-69-T013,PSI-69,Methanol,0.21,2074.2,2.59,0.7,0.0,0.09,10.8,,1.0,True,True
PSI-69-T014,PSI-69,Methanol,0.21,2055.6,3.7,0.7,0.0,0.09,11.3,,1.0,True,True
PSI-69-T015,PSI-69,Methanol,0.21,2066.6,4.42,0.7,0.0,0.09,23.1,,1.0,True,True
PSI-69-T016,PSI-69,Methanol,0.21,2072.1,1.66,0.7,0.0,0.09,3.4,1.0,1.0,True,True
PSI-69-T017,PSI-69,Methanol,0.21,1545.7,2.67,0.7,0.0,0.09,2.4,,1.0,True,True
PSI-69-T018,PSI-69,Heptane,0.21,1553.8,2.74,0.7,0.0,0.09,8.1,1.77,1.0,True,True
PSI-69-T019,PSI-69,Heptane,0.34,539.1,3.39,0.0,0.0,0.66,4.2,,1.0,True,True
PSI-69-T020,PSI-69,Methanol,0.34,539.5,3.4,0.0,0.0,0.66,17.4,1.56,1.0,True,True
PSI-69-T021,PSI-69,Methanol,0.34,540.6,3.49,0.0,0.0,0.66,17.8,0.95,1.0,True,True
PSI-69-T022,PSI-69,Methanol,0.34,540.5,3.5,0.0,0.0,0.66,18.2,,1.0,True,True
PSI-69-T023,PSI-69,Heptane,0.34,541.8,3.01,0.0,0.0,0.66,13.1,,1.0,True,True
PSI-69-T024,PSI-69,Heptane,0.34,542.8,,0.0,0.0,0.66,,,1.0,True,False
PSI-69-T025,PSI-69,Methanol,0.3,537.3,2.6,0.0,0.0,0.7,10.3,0.59,1.0,True,True
PSI-69-T026,PSI-69,Methanol,0.3,538.4,3.63,0.0,0.0,0.7,22.2,0.4,1.0,True,True
PSI-69-T027,PSI-69,Heptane,0.3,540.7,3.87,0.0,0.0,0.7,23.8,,1.0,True,True
PSI-69-T028,PSI-69,Heptane,0.3,539.7,3.36,0.0,0.0,0.7,17.3,,1.0,True,True
PSI-69-T029,PSI-69,Methanol,0.3,766.9,2.57,0.0,0.0,0.7,10.4,,1.0,True,True
PSI-69-T030,PSI-69,Methanol,0.3,769.2,3.26,0.0,0.0,0.7,15.6,1.32,1.0,True,True
PSI-69-T031,PSI-69,Heptane,0.3,770.5,3.39,0.0,0.0,0.7,18.4,,1.0,True,True
PSI-69-T032,PSI-69,Heptane,0.3,771.0,3.07,0.0,0.0,0.7,14.0,,1.0,True,True
PSI-69-T033,PSI-69,Methanol,0.21,764.5,2.62,0.0,0.0,0.79,11.4,1.25,1.0,True,True
PSI-69-T034,PSI-69,Methanol,0.21,767.7,3.89,0.0,0.0,0.79,27.3,2.0,1.0,True,True
PSI-69-T035,PSI-69,Heptane,0.21,768.1,3.85,0.0,0.0,0.79,8.9,3.34,1.0,True,True
PSI-69-T036,PSI-69,Methanol,0.2,539.0,2.4,0.0,0.0,0.8,7.1,1.67,1.0,True,True
PSI-69-T037,PSI-69,Methanol,0.34,534.3,3.31,0.0,0.0,0.66,10.7,,1.0,True,True
PSI-69-T038,PSI-69,Methanol,0.34,534.4,3.59,0.0,0.0,0.66,15.3,,1.0,True,True
PSI-69-T039,PSI-69,Heptane,0.34,534.9,2.91,0.0,0.0,0.66,9.9,0.0,1.0,True,True
PSI-69-T040,PSI-69,Methanol,0.3,535.1,3.77,0.0,0.0,0.7,19.2,,1.0,True,True
PSI-69-T041,PSI-69,Methanol,0.3,534.3,3.35,0.0,0.0,0.7,14.1,,1.0,True,True
PSI-69-T042,PSI-69,Heptane,0.3,535.0,2.92,0.0,0.0,0.7,11.3,,1.0,True,True
PSI-69-T043,PSI-69,Heptane,0.3,534.9,2.97,0.0,0.0,0.7,11.4,0.0,1.0,True,True
PSI-69-T044,PSI-69,Methanol,0.3,766.8,3.49,0.0,0.0,0.7,16.6,,1.0,True,True
PSI-69-T045,PSI-69,Methanol,0.3,768.3,2.42,0.0,0.0,0.7,6.6,1.01,1.0,True,True
PSI-69-T046,PSI-69,Methanol,0.21,769.5,2.78,0.0,0.0,0.79,13.1,1.08,1.0,True,True
PSI-69-T047,PSI-69,Heptane,0.21,770.1,3.36,0.0,0.0,0.79,17.1,,1.0,True,True
PSI-69-T048,PSI-69,Methanol,0.21,768.7,3.66,0.0,0.0,0.79,23.5,,1.0,True,True
PSI-69-T049,PSI-69,Heptane,0.21,764.9,3.46,0.0,0.0,0.79,8.6,2.78,1.0,True,True
PSI-69-T050,PSI-69,Heptane,0.21,770.1,3.57,0.0,0.0,0.79,8.4,2.98,1.0,True,True
PSI-69-T051,PSI-69,Heptane,0.21,771.4,2.41,0.0,0.0,0.79,8.2,0.0,1.0,True,True
PSI-69-T052,PSI-69,Heptane,0.3,771.1,3.53,0.0,0.0,0.7,18.3,0.0,1.0,True,True
PSI-69-T053,PSI-69,Heptane,0.21,770.2,,0.0,0.0,0.79,18.5,,1.0,True,False
PSI-69-T054,PSI-69,Methanol,0.2,541.4,3.56,0.0,0.0,0.8,29.0,,1.0,True,True
PSI-69-T055,PSI-69,Methanol,0.2,542.6,3.37,0.0,0.0,0.8,20.5,2.39,1.0,True,True
PSI-69-T056,PSI-69,Heptane,0.2,544.1,3.56,0.0,0.0,0.79,7.9,3.04,0.99,True,True
PSI-69-T057,PSI-69,Heptane,0.2,544.4,3.1,0.0,0.0,0.79,6.8,2.49,0.99,True,True
PSI-69-T058,PSI-69,Methanol,0.18,773.3,3.69,0.0,0.0,0.82,29.1,,1.0,True,True
PSI-69-T059,PSI-69,Methanol,0.18,769.2,2.93,0.0,0.0,0.82,17.7,1.39,1.0,True,True
PSI-69-T060,PSI-69,Methanol,0.18,773.7,3.43,0.0,0.0,0.82,23.2,,1.0,True,True
PSI-69-T061,PSI-69,Methanol,0.18,774.1,3.68,0.0,0.0,0.82,25.7,2.0,1.0,True,True
PSI-69-T062,PSI-69,Heptane,0.18,761.8,3.43,0.0,0.0,0.82,4.8,3.17,1.0,True,True
PSI-69-T063,PSI-69,Heptane,0.18,767.6,2.15,0.0,0.0,0.81,9.6,0.0,0.99,True,True
PSI-69-T064,PSI-69,Heptane,0.18,764.6,2.69,0.0,0.0,0.81,5.5,2.07,0.99,True,True
PSI-69-T065,PSI-69,Methanol,0.15,765.9,3.37,0.0,0.0,0.85,24.3,,1.0,True,True
PSI-69-T066,PSI-69,Methanol,0.15,766.8,2.52,0.0,0.0,0.85,12.9,1.32,1.0,True,True
PSI-69-T067,PSI-69,Methanol,0.15,767.7,3.97,0.0,0.0,0.85,14.4,3.3,1.0,True,True
PSI-69-T068,PSI-69,Methanol,0.15,768.8,2.38,0.0,0.0,0.84,10.7,1.29,0.99,True,True
PSI-69-T069,PSI-69,Heptane,0.14,767.1,1.1,0.0,0.0,0.84,1.3,0.0,0.98,False,True
PSI-69-T070,PSI-69,Heptane,0.15,761.0,4.67,0.0,0.0,0.84,1.6,4.6,0.99,True,True
PSI-69-T071,PSI-69,Methanol,0.15,768.3,2.25,0.0,0.0,0.84,8.4,,0.99,True,True
PSI-69-T072,PSI-69,Heptane,0.15,765.2,1.13,0.0,0.0,0.84,2.5,,0.99,True,True
PSI-69-T073,PSI-69,Heptane,0.15,761.0,4.64,0.0,0.0,0.84,1.5,4.58,0.99,True,True
PSI-69-T074,PSI-69,Heptane,0.15,765.9,1.33,0.0,0.0,0.84,2.3,,0.99,True,True
PSI-69-T075,PSI-69,Methanol,0.13,770.8,2.54,0.0,0.0,0.85,9.1,1.78,0.98,False,True
PSI-69-T076,PSI-69,Methanol,0.13,769.5,3.21,0.0,0.0,0.85,8.9,2.78,0.98,False,True
PSI-69-T077,PSI-69,Methanol,0.14,768.4,3.33,0.0,0.0,0.85,8.5,2.91,0.99,True,True
PSI-69-T078,PSI-69,Methanol,0.14,766.0,2.66,0.0,0.0,0.85,12.9,1.66,0.99,True,True
PSI-69-T079,PSI-69,Heptane,0.13,768.1,2.92,0.0,0.0,0.85,1.5,2.86,0.98,False,True
PSI-69-T080,PSI-69,Heptane,0.13,770.0,,0.0,0.0,0.85,1.0,,0.98,False,False
PSI-69-T081,PSI-69,Heptane,0.13,770.2,,0.0,0.0,0.85,1.5,,0.98,False,False
PSI-69-T082,PSI-69,Methanol,0.13,764.6,2.84,0.0,0.0,0.87,7.5,2.39,1.0,True,True
PSI-69-T083,PSI-69,Methanol,0.12,772.0,,0.0,0.0,0.87,5.45,,0.99,True,False
PSI-69-T084,PSI-69,Methanol,0.12,767.2,2.35,0.0,0.0,0.87,10.8,1.42,0.99,True,True
PSI-69-T085,PSI-69,Methanol,0.12,771.2,2.4,0.0,0.0,0.87,9.3,1.77,0.99,True,True
PSI-69-T086,PSI-69,Methanol,0.12,770.0,3.07,0.0,0.0,0.87,9.0,2.56,0.99,True,True
PSI-69-T087,PSI-69,Methanol,0.12,771.2,2.64,0.0,0.0,0.87,9.3,1.92,0.99,True,True
PSI-69-T088,PSI-69,Methanol,0.25,537.5,3.01,0.15,0.0,0.6,14.8,,1.0,True,True
PSI-69-T089,PSI-69,Methanol,0.25,537.4,3.7,0.15,0.0,0.6,24.0,,1.0,True,True
PSI-69-T090,PSI-69,Methanol,0.25,539.2,3.62,0.15,0.0,0.6,20.1,,1.0,True,True
PSI-69-T091,PSI-69,Methanol,0.25,538.3,3.51,0.15,0.0,0.6,18.0,,1.0,True,True
PSI-69-T092,PSI-69,Heptane,0.25,536.3,3.41,0.15,0.0,0.6,21.7,,1.0,True,True
PSI-69-T093,PSI-69,Heptane,0.25,537.3,2.48,0.15,0.0,0.6,8.3,0.0,1.0,True,True
PSI-69-T094,PSI-69,Heptane,0.24,533.6,3.53,0.2,0.0,0.56,10.1,2.76,1.0,True,True
PSI-69-T095,PSI-69,Heptane,0.24,534.4,3.6,0.2,0.0,0.56,8.0,3.04,1.0,True,True
PSI-69-T096,PSI-69,Heptane,0.24,534.4,,0.2,0.0,0.56,5.2,,1.0,True,False
PSI-69-T097,PSI-69,Methanol,0.23,534.2,4.25,0.2,0.0,0.56,26.5,2.6,0.99,True,True
PSI-69-T098,PSI-69,Methanol,0.23,537.1,3.64,0.25,0.0,0.52,22.9,1.74,1.0,True,True
PSI-69-T099,PSI-69,Methanol,0.23,535.0,4.28,0.25,0.0,0.52,33.0,2.32,1.0,True,True
PSI-69-T100,PSI-69,Heptane,0.23,536.7,4.14,0.25,0.0,0.52,6.1,3.98,1.0,True,True
PSI-69-T101,PSI-69,Heptane,0.23,538.7,3.88,0.25,0.0,0.52,6.5,3.45,1.0,True,True
PSI-69-T102,PSI-69,Heptane,0.21,534.2,3.57,0.3,0.0,0.49,4.2,3.43,1.0,True,True
PSI-69-T103,PSI-69,Heptane,0.21,534.3,4.0,0.3,0.0,0.49,3.2,3.88,1.0,True,True
PSI-69-T104,PSI-69,Methanol,0.23,534.1,3.6,0.2,0.0,0.56,23.2,1.58,0.99,True,True
PSI-69-T105,PSI-69,Methanol,0.23,534.6,4.17,0.2,0.0,0.56,30.7,2.0,0.99,True,True
PSI-69-T106,PSI-69,Methanol,0.23,538.3,3.08,0.25,0.0,0.52,14.1,1.75,1.0,True,True
PSI-69-T107,PSI-69,Methanol,0.23,535.0,3.18,0.2,0.0,0.56,15.1,,0.99,True,True
PSI-69-T108,PSI-69,Methanol,0.23,538.3,3.75,0.25,0.0,0.52,24.3,,1.0,True,True
PSI-69-T109,PSI-69,Methanol,0.21,536.5,3.56,0.3,0.0,0.49,,1.92,1.0,True,False
PSI-69-T110,PSI-69,Methanol,0.21,537.0,2.83,0.3,0.0,0.49,13.0,1.57,1.0,True,True
PSI-69-T111,PSI-69,Methanol,0.21,536.9,3.37,0.3,0.0,0.49,16.4,2.1,1.0,True,True
PSI-69-T112,PSI-69,Methanol,0.21,530.7,3.99,0.3,0.0,0.49,25.2,2.35,1.0,True,True
PSI-69-T113,PSI-69,Methanol,0.2,534.6,4.2,0.35,0.0,0.45,18.2,2.85,1.0,True,True
PSI-69-T114,PSI-69,Methanol,0.2,,3.23,0.35,0.0,0.45,18.9,1.68,1.0,True,False
PSI-69-T115,PSI-69,Methanol,0.2,535.8,3.97,0.35,0.0,0.45,22.9,2.61,1.0,True,True
PSI-69-T116,PSI-69,Methanol,0.2,536.3,3.16,0.35,0.0,0.45,16.9,1.57,1.0,True,True
PSI-69-T117,PSI-69,Heptane,0.2,531.1,3.84,0.35,0.0,0.45,2.4,3.77,1.0,True,True
PSI-69-T118,PSI-69,Heptane,0.2,532.8,3.03,0.35,0.0,0.44,2.5,2.93,0.99,True,True
PSI-69-T119,PSI-69,Heptane,0.18,532.6,2.6,0.4,0.0,0.42,1.3,2.48,1.0,True,True
PSI-69-T120,PSI-69,Heptane,0.18,532.5,2.45,0.4,0.0,0.42,1.43,2.39,1.0,True,True
PSI-69-T121,PSI-69,Methanol,0.18,526.3,4.25,0.4,0.0,0.42,8.0,3.92,1.0,True,True
PSI-69-T122,PSI-69,Methanol,0.18,531.2,3.46,0.4,0.0,0.42,13.9,2.58,1.0,True,True
PSI-69-T123,PSI-69,Methanol,0.18,532.0,4.13,0.4,0.0,0.42,8.7,3.79,1.0,True,True
PSI-69-T124,PSI-69,Methanol,0.18,532.4,2.87,0.4,0.0,0.42,2.4,2.74,1.0,True,True
PSI-69-T125,PSI-69,Methanol,0.17,537.2,3.63,0.45,0.0,0.38,5.7,3.37,1.0,True,True
PSI-69-T126,PSI-69,Methanol,0.17,536.1,2.8,0.45,0.0,0.38,11.7,1.84,1.0,True,True
PSI-69-T127,PSI-69,Methanol,0.17,536.7,3.22,0.45,0.0,0.38,11.0,2.53,1.0,True,True
PSI-69-T128,PSI-69,Methanol,0.17,537.3,2.91,0.45,0.0,0.38,11.5,,1.0,True,True
PSI-69-T129,PSI-69,Heptane,0.17,536.2,3.33,0.45,0.0,0.38,0.55,3.34,1.0,True,True
PSI-69-T130,PSI-69,Heptane,0.17,537.2,2.91,0.45,0.0,0.38,0.6,2.89,1.0,True,True
PSI-69-T131,PSI-69,Heptane,0.24,763.9,1.72,0.2,0.0,0.56,4.9,0.52,1.0,True,True
PSI-69-T132,PSI-69,Heptane,0.24,765.2,2.63,0.2,0.0,0.56,12.4,0.53,1.0,True,True
PSI-69-T133,PSI-69,Heptane,0.24,766.7,3.25,0.2,0.0,0.56,19.0,0.55,1.0,True,True
PSI-69-T134,PSI-69,Heptane,0.24,767.2,3.66,0.2,0.0,0.56,9.2,2.88,1.0,True,True
PSI-69-T135,PSI-69,Heptane,0.24,768.2,2.78,0.2,0.0,0.56,10.8,0.0,1.0,True,True
PSI-69-T136,PSI-69,Heptane,0.24,768.1,3.08,0.2,0.0,0.56,17.0,,1.0,True,True
PSI-69-T137,PSI-69,Heptane,0.24,768.2,3.13,0.2,0.0,0.56,17.5,,1.0,True,True
PSI-69-T139,PSI-69,Heptane,0.24,768.0,1.75,0.2,0.0,0.56,5.4,,1.0,True,True
PSI-69-T140,PSI-69,Methanol,0.15,533.5,3.98,0.5,0.0,0.35,1.3,3.95,1.0,True,True
PSI-69-T141,PSI-69,Methanol,0.15,534.1,2.86,0.5,0.0,0.35,2.3,2.73,1.0,True,True
PSI-69-T142,PSI-69,Methanol,0.15,534.5,1.86,0.5,0.0,0.35,3.4,1.48,1.0,True,True
PSI-69-T143,PSI-69,Methanol,0.15,534.7,2.25,0.5,0.0,0.35,2.7,2.06,1.0,True,True
PSI-69-T144,PSI-69,Methanol,0.2,761.9,3.53,0.05,0.0,0.75,23.8,1.53,1.0,True,True
PSI-69-T145,PSI-69,Methanol,0.2,763.5,3.33,0.05,0.0,0.75,20.0,1.61,1.0,True,True
PSI-69-T146,PSI-69,Methanol,0.2,765.5,4.35,0.05,0.0,0.75,39.2,1.95,1.0,True,True
PSI-69-T147,PSI-69,Methanol,0.17,535.7,3.02,0.45,0.0,0.38,7.8,2.49,1.0,True,True
PSI-69-T148,PSI-69,Heptane,0.2,764.4,2.58,0.05,0.0,0.75,11.8,1.15,1.0,True,True
PSI-69-T149,PSI-69,Heptane,0.2,766.2,2.21,0.05,0.0,0.75,8.9,0.82,1.0,True,True
PSI-69-T150,PSI-69,Heptane,0.2,767.6,3.18,0.05,0.0,0.75,8.0,2.54,1.0,True,True
PSI-69-T151,PSI-69,Methanol,0.18,762.5,3.86,0.15,0.0,0.67,31.3,,1.0,True,True
PSI-69-T152,PSI-69,Methanol,0.18,765.0,3.33,0.15,0.0,0.67,23.2,1.23,1.0,True,True
PSI-69-T153,PSI-69,Methanol,0.18,765.6,2.78,0.15,0.0,0.67,15.7,1.19,1.0,True,True
PSI-69-T154,PSI-69,Heptane,0.18,762.3,3.7,0.15,0.0,0.67,2.2,3.6,1.0,True,True
PSI-69-T155,PSI-69,Heptane,0.18,764.9,2.73,0.15,0.0,0.67,2.7,2.52,1.0,True,True
PSI-69-T156,PSI-69,Heptane,0.18,765.7,1.34,0.15,0.0,0.67,3.2,0.45,1.0,True,True
PSI-69-T157,PSI-69,Methanol,0.16,762.1,4.24,0.25,0.0,0.59,7.6,3.96,1.0,True,True
PSI-69-T158,PSI-69,Methanol,0.16,764.4,3.7,0.25,0.0,0.59,10.1,3.22,1.0,True,True
PSI-69-T159,PSI-69,Methanol,0.16,765.5,2.71,0.25,0.0,0.59,14.9,1.34,1.0,True,True
PSI-69-T160,PSI-69,Methanol,0.16,767.6,2.77,0.25,0.0,0.59,14.8,1.52,1.0,True,True
PSI-69-T161,PSI-69,Methanol,0.15,763.3,3.72,0.32,0.0,0.54,6.0,3.5,1.01,True,True
PSI-69-T162,PSI-69,Methanol,0.15,764.4,3.05,0.32,0.0,0.53,8.5,2.54,1.0,True,True
PSI-69-T163,PSI-69,Methanol,0.15,765.9,2.59,0.32,0.0,0.53,11.6,1.63,1.0,True,True
PSI-69-T164,PSI-69,Methanol,0.15,766.1,2.59,0.32,0.0,0.53,8.9,1.79,1.0,True,True
PSI-69-T165,PSI-69,Heptane,0.18,765.4,1.96,0.15,0.0,0.67,3.9,1.39,1.0,True,True
PSI-69-T166,PSI-69,Methanol,0.14,760.8,3.22,0.36,0.0,0.5,3.4,3.08,1.0,True,True
PSI-69-T167,PSI-69,Methanol,0.14,761.6,2.32,0.36,0.0,0.5,5.9,1.84,1.0,True,True
PSI-69-T168,PSI-69,Methanol,0.21,763.4,3.03,0.15,0.0,0.64,15.6,1.57,1.0,True,True
PSI-69-T169,PSI-69,Methanol,0.21,766.1,3.05,0.15,0.0,0.64,16.7,1.28,1.0,True,True
PSI-69-T170,PSI-69,Methanol,0.21,766.7,3.53,0.15,0.0,0.64,23.6,1.59,1.0,True,True
PSI-69-T171,PSI-69,Heptane,0.18,759.9,3.74,0.15,0.0,0.67,2.8,3.68,1.0,True,True
PSI-69-T172,PSI-69,Heptane,0.18,762.0,2.4,0.15,0.0,0.67,4.4,1.96,1.0,True,True
PSI-69-T173,PSI-69,Heptane,0.18,762.1,1.35,0.15,0.0,0.67,3.6,0.47,1.0,True,True
PSI-69-T174,PSI-69,Heptane,0.24,531.7,2.5,0.2,0.0,0.56,11.2,0.21,1.0,True,True
PSI-69-T175,PSI-69,Heptane,0.24,532.1,2.88,0.2,0.0,0.56,15.6,,1.0,True,True
PSI-69-T176,PSI-69,Methanol,0.24,536.9,4.53,0.2,0.0,0.56,38.2,,1.0,True,True
PSI-69-T177,PSI-69,Methanol,0.24,537.0,3.02,0.2,0.0,0.56,14.5,1.35,1.0,True,True
PSI-69-T178,PSI-69,Heptane,0.23,533.6,3.32,0.25,0.0,0.52,8.9,2.61,1.0,True,True
PSI-69-T179,PSI-69,Heptane,0.23,534.4,2.07,0.25,0.0,0.52,7.5,0.48,1.0,True,True
PSI-69-T180,PSI-69,Heptane,0.19,758.4,3.4,0.1,0.0,0.71,4.5,3.13,1.0,True,True
PSI-69-T181,PSI-69,Heptane,0.19,759.1,2.48,0.1,0.0,0.71,7.0,1.68,1.0,True,True
PSI-69-T182,PSI-69,Heptane,0.19,759.0,1.64,0.1,0.0,0.71,5.1,0.49,1.0,True,True
PSI-69-T183,PSI-69,Methanol,0.23,534.4,3.72,0.25,0.0,0.52,26.2,,1.0,True,True
PSI-69-T184,PSI-69,Methanol,0.23,535.1,3.42,0.25,0.0,0.52,15.8,,1.0,True,True
PSI-69-T185,PSI-69,Methanol,0.23,535.2,2.8,0.25,0.0,0.52,12.7,1.33,1.0,True,True
PSI-69-T186,PSI-69,Methanol,0.23,536.2,2.47,0.25,0.0,0.52,9.2,1.21,1.0,True,True
PSI-69-T187,PSI-69,Methanol,0.19,758.0,3.38,0.1,0.0,0.71,21.8,1.29,1.0,True,True
PSI-69-T188,PSI-69,Methanol,0.19,758.1,2.47,0.1,0.0,0.71,11.0,1.08,1.0,True,True
PSI-69-T189,PSI-69,Methanol,0.18,761.2,3.77,0.15,0.0,0.67,30.5,1.78,1.0,True,True
PSI-69-T190,PSI-69,Methanol,0.18,764.6,2.74,0.15,0.0,0.67,14.0,0.95,1.0,True,True
PSI-69-T191,PSI-69,Methanol,0.18,765.3,1.76,0.15,0.0,0.67,5.5,0.81,1.0,True,True
PSI-69-T192,PSI-69,Methanol,0.17,759.5,3.46,0.2,0.0,0.63,21.8,,1.0,True,True
PSI-69-T193,PSI-69,Methanol,0.17,759.1,2.77,0.2,0.0,0.63,15.6,1.27,1.0,True,True
PSI-69-T194,PSI-69,Heptane,0.17,752.0,3.76,0.2,0.0,0.63,1.6,3.71,1.0,True,True
PSI-69-T195,PSI-69,Heptane,0.17,752.5,2.9,0.2,0.0,0.63,1.9,2.79,1.0,True,True
PSI-69-T196,PSI-69,Heptane,0.2,758.4,3.06,0.05,0.0,0.75,8.9,2.28,1.0,True,True
PSI-69-T197,PSI-69,Heptane,0.2,759.8,3.04,0.05,0.0,0.75,8.1,2.33,1.0,True,True
PSI-69-T198,PSI-69,Heptane,0.2,760.1,2.12,0.05,0.0,0.75,8.7,0.13,1.0,True,True
PSI-69-T199,PSI-69,Methanol,0.2,754.0,3.37,0.05,0.0,0.75,21.0,0.98,1.0,True,True
PSI-69-T200,PSI-69,Methanol,0.2,756.1,2.57,0.05,0.0,0.75,11.7,1.13,1.0,True,True
PSI-69-T201,PSI-69,Methanol,0.2,756.9,2.4,0.05,0.0,0.75,10.2,1.05,1.0,True,True
PSI-69-T202,PSI-69,Methanol,0.21,760.2,3.3,0.0,0.0,0.79,19.5,1.42,1.0,True,True
PSI-69-T203,PSI-69,Methanol,0.21,761.6,2.75,0.0,0.0,0.79,12.8,1.11,1.0,True,True
PSI-69-T204,PSI-69,Heptane,0.21,756.5,3.56,0.0,0.0,0.79,23.9,,1.0,True,True
PSI-69-T205,PSI-69,Heptane,0.21,757.3,3.58,0.0,0.0,0.79,24.0,,1.0,True,True
PSI-69-T206,PSI-69,Heptane,0.21,760.2,2.96,0.0,0.0,0.79,17.1,0.47,1.0,True,True
PSI-69-T207,PSI-69,Heptane,0.21,762.7,2.72,0.0,0.0,0.79,11.5,1.13,1.0,True,True
PSI-69-T208,PSI-69,Heptane,0.21,762.9,2.92,0.0,0.0,0.79,12.8,,1.0,True,True
PSI-69-T209,PSI-69,Heptane,0.16,759.8,3.34,0.0,0.0,0.84,3.4,3.18,1.0,True,True
PSI-69-T211,PSI-69,Heptane,0.16,759.9,2.52,0.0,0.0,0.84,4.5,2.13,1.0,True,True
PSI-69-T212,PSI-69,Heptane,0.15,764.0,2.55,0.0,0.0,0.85,3.4,2.31,1.0,True,True
PSI-69-T213,PSI-69,Heptane,0.14,759.8,4.16,0.0,0.0,0.86,1.6,4.15,1.0,True,True
PSI-69-T214,PSI-69,Heptane,0.14,759.9,1.83,0.0,0.0,0.86,3.8,,1.0,True,True
PSI-69-T215,PSI-69,Methanol,0.14,757.6,3.5,0.0,0.0,0.86,26.0,,1.0,True,True
PSI-69-T216,PSI-69,Methanol,0.14,758.3,2.67,0.0,0.0,0.86,15.6,1.27,1.0,True,True
PSI-69-T217,PSI-69,Methanol,0.13,759.4,3.46,0.0,0.0,0.87,9.5,2.96,1.0,True,True
PSI-69-T218,PSI-69,Methanol,0.13,760.6,2.75,0.0,0.0,0.87,16.3,1.46,1.0,True,True
PSI-69-T219,PSI-69,Methanol,0.12,761.6,2.6,0.0,0.0,0.88,6.9,2.09,1.0,True,True
PSI-69-T220,PSI-69,Methanol,0.12,761.9,1.94,0.0,0.0,0.88,7.8,1.05,1.0,True,True
PSI-69-T221,PSI-69,Methanol,0.12,763.7,1.84,0.0,0.0,0.88,6.0,1.04,1.0,True,True
PSI-69-T222,PSI-69,Methanol,0.2,759.2,2.91,0.0,0.05,0.75,14.4,1.12,1.0,True,True
PSI-69-T223,PSI-69,Methanol,0.2,759.6,,0.0,0.05,0.75,,,1.0,True,False
PSI-69-T224,PSI-69,Heptane,0.2,755.3,2.25,0.0,0.05,0.75,,,1.0,True,False
PSI-69-T225,PSI-69,Methanol,0.19,753.4,2.78,0.0,0.1,0.71,12.5,,1.0,True,True
PSI-69-T226,PSI-69,Methanol,0.18,759.2,2.79,0.0,0.15,0.67,12.5,1.3,1.0,True,True
PSI-69-T227,PSI-69,Methanol,0.18,760.3,2.95,0.0,0.15,0.67,11.7,1.67,1.0,True,True
PSI-69-T228,PSI-69,Heptane,0.21,767.4,3.32,0.0,0.0,0.79,17.5,1.37,1.0,True,True
PSI-69-T229,PSI-69,Heptane,0.21,768.1,2.39,0.0,0.0,0.79,10.6,,1.0,True,True
PSI-69-T230,PSI-69,Heptane,0.21,769.2,3.65,0.0,0.0,0.79,9.6,2.85,1.0,True,True
PSI-69-T231,PSI-69,Heptane,0.19,758.8,2.59,0.0,0.1,0.71,12.0,,1.0,True,True
PSI-69-T232,PSI-69,Heptane,0.18,763.7,3.52,0.0,0.15,0.67,4.1,3.28,1.0,True,True
PSI-69-T233,PSI-69,Heptane,0.18,765.9,2.3,0.0,0.15,0.67,9.1,,1.0,True,True
PSI-69-T234,PSI-69,Heptane,0.18,766.5,2.27,0.0,0.15,0.67,8.6,,1.0,True,True
PSI-69-T235,PSI-69,Heptane,0.17,759.3,2.85,0.0,0.2,0.63,3.2,2.6,1.0,True,True
PSI-69-T236,PSI-69,Heptane,0.17,759.3,2.12,0.0,0.2,0.63,4.5,1.39,1.0,True,True
PSI-69-T237,PSI-69,Heptane,0.17,759.6,,0.0,0.2,0.63,1.7,,1.0,True,False
PSI-69-T238,PSI-69,Heptane,0.17,759.8,1.61,0.0,0.2,0.63,2.7,,1.0,True,True
PSI-69-T239,PSI-69,Methanol,0.17,754.2,2.99,0.0,0.2,0.63,9.1,,1.0,True,True
PSI-69-T240,PSI-69,Methanol,0.17,757.0,2.9,0.0,0.2,0.63,13.1,1.42,1.0,True,True
PSI-69-T241,PSI-69,Methanol,0.16,759.9,3.4,0.0,0.25,0.59,7.9,2.79,1.0,True,True
PSI-69-T242,PSI-69,Methanol,0.16,761.0,,0.0,0.25,0.59,5.0,,1.0,True,False
PSI-69-T243,PSI-69,Heptane,0.16,757.9,1.49,0.0,0.25,0.59,2.9,0.69,1.0,True,True
PSI-69-T244,PSI-69,Methanol,0.15,755.6,3.67,0.0,0.3,0.55,3.6,3.47,1.0,True,True
PSI-69-T245,PSI-69,Methanol,0.15,756.7,2.52,0.0,0.3,0.55,4.0,2.06,1.0,True,True
PSI-69-T246,PSI-69,Methanol,0.14,759.2,2.44,0.0,0.35,0.51,1.5,2.26,1.0,True,True
PSI-69-T247,PSI-69,Methanol,0.14,759.8,1.88,0.0,0.35,0.51,1.0,1.73,1.0,True,True
PSI-69-T248,PSI-69,Methanol,0.13,763.5,3.56,0.0,0.4,0.47,0.3,3.54,1.0,True,True
PSI-69-T249,PSI-69,Heptane,0.24,534.0,3.78,0.0,0.2,0.56,12.2,2.52,1.0,True,True
PSI-69-T250,PSI-69,Heptane,0.23,532.2,2.8,0.0,0.25,0.52,11.4,0.12,1.0,True,True
PSI-69-T251,PSI-69,Methanol,0.24,534.3,2.82,0.0,0.2,0.56,11.2,1.03,1.0,True,True
PSI-69-T252,PSI-69,Methanol,0.24,534.6,2.79,0.0,0.2,0.56,8.1,1.53,1.0,True,True
PSI-69-T253,PSI-69,Methanol,0.23,531.7,2.45,0.0,0.25,0.52,8.3,0.86,1.0,True,True
PSI-69-T254,PSI-69,Methanol,0.23,531.8,2.61,0.0,0.25,0.52,6.3,,1.0,True,True
PSI-69-T255,PSI-69,Methanol,0.21,531.9,3.22,0.0,0.3,0.49,10.4,,1.0,True,True
PSI-69-T256,PSI-69,Methanol,0.21,531.2,3.25,0.0,0.3,0.49,12.1,1.78,1.0,True,True
PSI-69-T257,PSI-69,Methanol,0.21,531.2,2.67,0.0,0.3,0.49,7.6,1.42,1.0,True,True
PSI-69-T258,PSI-69,Heptane,0.21,529.6,3.23,0.0,0.3,0.49,7.5,2.33,1.0,True,True
PSI-69-T259,PSI-69,Heptane,0.21,529.0,2.86,0.0,0.3,0.49,11.0,0.71,1.0,True,True
PSI-69-T260,PSI-69,Heptane,0.2,532.5,3.69,0.0,0.35,0.45,4.3,3.32,1.0,True,True
PSI-69-T261,PSI-69,Heptane,0.2,532.0,3.08,0.0,0.35,0.45,5.4,1.69,1.0,True,True
PSI-69-T262,PSI-69,Methanol,0.2,527.6,3.87,0.0,0.35,0.45,17.4,2.24,1.0,True,True
PSI-69-T263,PSI-69,Methanol,0.2,527.9,2.95,0.0,0.35,0.45,10.6,1.5,1.0,True,True
PSI-69-T264,PSI-69,Methanol,0.18,532.4,3.5,0.0,0.4,0.42,7.8,2.67,1.0,True,True
PSI-69-T265,PSI-69,Methanol,0.18,532.9,2.7,0.0,0.4,0.42,5.9,1.92,1.0,True,True
PSI-69-T266,PSI-69,Methanol,0.18,533.2,1.84,0.0,0.4,0.42,2.3,1.3,1.0,True,True
PSI-69-T267,PSI-69,Heptane,0.18,528.0,2.27,0.0,0.4,0.42,3.5,1.64,1.0,True,True
PSI-69-T268,PSI-69,Heptane,0.18,530.3,1.86,0.0,0.4,0.42,3.5,0.84,1.0,True,True
PSI-69-T269,PSI-69,Heptane,0.17,532.2,2.22,0.0,0.45,0.38,1.9,1.86,1.0,True,True
PSI-69-T270,PSI-69,Heptane,0.17,532.5,1.61,0.0,0.45,0.38,1.4,0.91,1.0,True,True
PSI-69-T271,PSI-69,Methanol,0.17,530.4,2.79,0.0,0.45,0.38,4.0,2.3,1.0,True,True
PSI-69-T272,PSI-69,Methanol,0.17,531.5,2.68,0.0,0.45,0.38,2.9,2.31,1.0,True,True
PSI-69-T273,PSI-69,Heptane,0.21,764.7,3.54,0.0,0.15,0.64,7.6,2.91,1.0,True,True
PSI-69-T274,PSI-69,Heptane,0.21,766.2,2.82,0.0,0.15,0.64,11.7,0.73,1.0,True,True
'@
W 'backend/app/lab/next_experiment_engine.py' @'

def recommend_next_experiment(investigation):

    if investigation.get("status") != "OK":
        return {
            "status": "UNAVAILABLE",
            "reason": "Valid investigation required."
        }

    audit = investigation.get(
        "actual_evidence_audit", {}
    )

    alerts = audit.get("alerts", [])

    if not alerts:
        return {
            "status": "REVIEW_REQUIRED",
            "reason": (
                "No specific evidence gap was detected "
                "by the current audit."
            )
        }

    evidence = investigation.get("evidence", {})

    changed = investigation.get(
        "changed_variables", []
    )

    target = (
        changed[0]
        if len(changed) == 1
        else None
    )

    if target is None:
        return {
            "status": "REVIEW_REQUIRED",
            "reason": (
                "Select one research variable before "
                "designing a controlled comparison."
            ),
            "detected_gaps": alerts
        }

    labels = {
        "o2_fraction": "Oxygen concentration",
        "pressure_mmhg": "Ambient pressure",
        "droplet_diameter_mm": "Droplet diameter",
        "fuel": "Fuel type"
    }

    controlled = [
        x for x in labels
        if x != target
    ]

    return {
        "status": "PROPOSED",
        "experiment": "Controlled Follow-up Study",
        "research_question": (
            "How does changing "
            + labels[target]
            + " relate to combustion behavior "
            "when other conditions are held constant?"
        ),
        "variable_to_change": target,
        "variables_to_control": controlled,
        "suggested_design": (
            "Conduct matched experimental runs "
            "where only the selected variable changes. "
            "Keep all other listed conditions fixed, "
            "and collect repeated measurements."
        ),
        "measurements": [
            "Burn time (seconds)",
            "Actual oxygen concentration",
            "Actual ambient pressure",
            "Initial droplet diameter",
            "Fuel type"
        ],
        "nasa_reference": "PSI-69",
        "supporting_test_ids": {
            "scenario_a": evidence.get(
                "scenario_a_test_ids", []
            ),
            "scenario_b": evidence.get(
                "scenario_b_test_ids", []
            )
        },
        "detected_gaps": alerts,
        "scientific_limitations": (
            "This is a proposed research design, "
            "not an executed NASA experiment. "
            "No outcome or fire-risk prediction "
            "is claimed. Feasibility and safety "
            "require expert review."
        )
    }
'@
W 'backend/app/lab/risk_assessment.py' @'

import numpy as np
from . import virtual_lab_engine as lab

# عتبات نسبية من توزيع بيانات NASA لكل وقود | Relative thresholds from the NASA data per fuel
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
'@
W 'backend/app/lab/router.py' @'
"""FlameGuard X routes (NASA PSI-69 virtual lab). Mounted by app/main.py as `lab_router`.

All paths start with /api so they match the FlameGuard X README:
  POST /api/lab                    one call for the Lab page: {mode: single|compare, scenario_a, scenario_b?}
  POST /api/virtual-lab            POST /api/compare           POST /api/detective
  GET  /api/crime-scene/oxygen-paradox
  GET  /api/lab/options            fuels + allowed ranges (to build the form)
  GET  /api/scientific-intelligence            (precomputed report)
  POST /api/scientific-intelligence/analyze    POST /api/mission-research-advisor
  GET  /api/combustion-explanation (physics explanation for given conditions)
  GET  /api/discoveries            GET /api/conditions-recommendations      GET /api/experimental-gaps
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, model_validator

from . import virtual_lab_engine as lab
from .combustion_explanation_engine import explain_combustion
from .crime_scene_engine import investigate_case
from .detective_api import detective_response
from .discovery_engine_v2 import discover_unusual_pairs
from .experimental_gap_engine import detect_experimental_gaps
from .lab_api import lab_response
from .mission_research_advisor import advise_research
from .safety_conditions_recommender import recommend_conditions

router = APIRouter(prefix="/api", tags=["flameguard-lab"])
REPORT = Path(__file__).resolve().parent / "scientific_intelligence_report.json"


class Scenario(BaseModel):
    o2_fraction: float = Field(gt=0, le=1)
    pressure_mmhg: float = Field(gt=0)
    droplet_diameter_mm: float = Field(gt=0)
    fuel: str


class ComparisonRequest(BaseModel):
    scenario_a: Scenario
    scenario_b: Scenario


class LabRequest(BaseModel):
    mode: Literal["single", "compare"] = "single"
    scenario_a: Scenario
    scenario_b: Optional[Scenario] = None


class ScientificScenario(BaseModel):
    fuel: str
    o2_fraction: float = Field(ge=0, le=1)
    pressure_mmhg: float = Field(gt=0)
    droplet_diameter_mm: float = Field(gt=0)
    co2_fraction: float = Field(default=0.0, ge=0, le=1)
    he_fraction: float = Field(default=0.0, ge=0, le=1)
    n2_fraction: Optional[float] = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def validate_gas_composition(self):
        if self.n2_fraction is None:
            self.n2_fraction = 1.0 - self.o2_fraction - self.co2_fraction - self.he_fraction
        total = self.o2_fraction + self.co2_fraction + self.he_fraction + self.n2_fraction
        if self.n2_fraction < 0 or abs(total - 1.0) > 0.015:
            raise ValueError(f"Invalid gas composition: total={total:.4f}. Gas fractions must sum to about 1.0.")
        return self


class MissionResearchRequest(ScientificScenario):
    research_question: Literal["burn_duration", "extinction", "oxygen_effect"] = "burn_duration"


@router.get("/lab/options")
def lab_options():
    return {"fuels": lab.FUELS, "ranges": lab.RANGES, "tests": int(len(lab.LAB))}


@router.post("/lab")
def lab_endpoint(req: LabRequest):
    if req.mode == "compare" and req.scenario_b is None:
        raise HTTPException(422, "scenario_b is required when mode is 'compare'")
    return lab_response(req.model_dump())


@router.post("/virtual-lab")
def virtual_lab(s: Scenario):
    return lab.run_scenario(**s.model_dump())


@router.post("/compare")
def compare(r: ComparisonRequest):
    return lab.compare_scenarios(r.scenario_a.model_dump(), r.scenario_b.model_dump())


@router.post("/detective")
def detective(r: ComparisonRequest):
    return detective_response(r.scenario_a.model_dump(), r.scenario_b.model_dump())


@router.get("/crime-scene/oxygen-paradox")
def crime_scene():
    return investigate_case()


@router.get("/scientific-intelligence")
def scientific_intelligence():
    return json.loads(REPORT.read_text(encoding="utf-8"))


@router.post("/scientific-intelligence/analyze")
def analyze(s: ScientificScenario):
    from .dynamic_intelligence_engine import analyze_scenario
    from .scientific_validation_engine import validate_scenario

    inputs = s.model_dump()
    dynamic = analyze_scenario(**inputs)
    return {
        "project": "FlameGuard X", "module": "Dynamic Scientific Intelligence",
        "status": "SUCCESS", "analysis_type": "ON_DEMAND", "source": "NASA PSI-69",
        "dynamic_intelligence": dynamic,
        "scientific_validation": validate_scenario(**inputs),
        "mission_evidence_readiness": dynamic["evidence_readiness"],
        "causal_claim_supported": False,
        "spacecraft_safety_certification_supported": False,
    }


@router.get("/discoveries")
def discoveries(fuel: Optional[str] = None, max_results: int = 20):
    return discover_unusual_pairs(fuel=fuel, max_results=max(1, min(max_results, 100)))


@router.post("/mission-research-advisor")
def mission_research(r: MissionResearchRequest):
    scenario = ScientificScenario(**r.model_dump(exclude={"research_question"}))
    return advise_research(**scenario.model_dump(), research_question=r.research_question)


@router.get("/conditions-recommendations")
def conditions(fuel: str = "Heptane", top_n: int = Query(default=5, ge=1, le=20)):
    return recommend_conditions(fuel=fuel, top_n=top_n)


@router.get("/experimental-gaps")
def gaps(fuel: str = "Heptane", bins: int = Query(default=6, ge=3, le=12)):
    try:
        return detect_experimental_gaps(fuel=fuel, bins=bins)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/combustion-explanation")
def combustion_explanation(
    fuel: str = "Heptane",
    o2_fraction: float = 0.21,
    pressure_mmhg: float = 760,
    droplet_diameter_mm: float = 3.0,
):
    try:
        return explain_combustion(fuel=fuel, o2_fraction=o2_fraction,
                                  pressure_mmhg=pressure_mmhg, droplet_diameter_mm=droplet_diameter_mm)
    except ValueError as e:
        raise HTTPException(422, str(e))
'@
W 'backend/app/lab/safety_conditions_recommender.py' @'

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
'@
W 'backend/app/lab/scientific_detective.py' @'
from . import virtual_lab_engine as lab

FIELDS = [
    "o2_fraction",
    "pressure_mmhg",
    "droplet_diameter_mm",
    "fuel"
]

def investigate(a, b):
    comparison = lab.compare_scenarios(a, b)

    if comparison["status"] != "OK":
        return {
            "status": "REJECTED",
            "verdict": "INSUFFICIENT_EVIDENCE",
            "reason": "One or both scenarios are invalid.",
            "comparison": comparison
        }

    ra = comparison["scenario_a"]
    rb = comparison["scenario_b"]
    changed = comparison["inputs_that_differ"]

    weak = any(
        r["support_level"] == "WEAK_MATCH"
        for r in (ra, rb)
    )

    evidence = {
        "experiment": "PSI-69",
        "scenario_a_test_ids": [
            t["test_id"] for t in ra["matched_tests"]
        ],
        "scenario_b_test_ids": [
            t["test_id"] for t in rb["matched_tests"]
        ],
        "burn_time_a_s": comparison["burn_time_median_a"],
        "burn_time_b_s": comparison["burn_time_median_b"],
        "difference_s": comparison["difference_b_minus_a"]
    }

    warnings = list(comparison["warnings"])

    if weak:
        verdict = "INSUFFICIENT_EVIDENCE"
        reason = (
            "At least one scenario has weak experimental "
            "support. A reliable comparison cannot be made."
        )
    elif len(changed) == 0:
        verdict = "COMPARABLE"
        reason = (
            "The requested conditions are identical. "
            "No controlled input difference is being tested."
        )
    elif len(changed) > 1:
        verdict = "CONFOUNDED"
        reason = (
            "Multiple input variables changed. "
            "The observed difference cannot be attributed "
            "to one variable."
        )
    elif changed[0] == "fuel":
        verdict = "CONFOUNDED"
        reason = (
            "Fuel type changed. Differences may reflect "
            "fuel properties and experimental conditions."
        )
    else:
        verdict = "COMPARABLE"
        reason = (
            "Only one requested input changed. "
            "This permits a descriptive comparison, "
            "but the matched NASA tests may differ "
            "in other measured conditions."
        )

    if len(changed) > 1:
        warnings.append(
            "CONFOUNDING ALERT: Multiple requested variables "
            "changed: " + ", ".join(changed) +
            ". Their individual effects cannot be isolated."
        )

    if weak:
        warnings.append(
            "EVIDENCE ALERT: At least one scenario has "
            "weak experimental support."
        )

    warnings.append(
        "CAUSALITY ALERT: The comparison does not establish "
        "that any variable caused the observed difference."
    )

    return {
        "status": "OK",
        "verdict": verdict,
        "reason": reason,
        "changed_variables": changed,
        "evidence": evidence,
        "warnings": warnings,
        "research_gap": (
            "More controlled NASA measurements are needed "
            "to isolate the effect of individual variables."
        )
    }


def audit_actual_evidence(comparison):
    """Audit the actual NASA reference tests."""

    fields = [
        "o2_fraction",
        "pressure_mmhg",
        "droplet_diameter_mm"
    ]

    scenarios = {
        "A": comparison["scenario_a"],
        "B": comparison["scenario_b"]
    }

    ranges = {}
    alerts = []

    for name, scenario in scenarios.items():
        tests = scenario.get("matched_tests", [])
        ranges[name] = {}

        for field in fields:
            values = [
                float(t[field])
                for t in tests
                if t.get(field) is not None
            ]

            ranges[name][field] = {
                "min": min(values) if values else None,
                "max": max(values) if values else None
            }

        oxygen_values = [
            t["o2_fraction"] for t in tests
            if t.get("o2_fraction") is not None
        ]

        if len(set(oxygen_values)) > 1:
            alerts.append(
                f"Scenario {name}: matched NASA tests "
                "have different oxygen concentrations."
            )

    for field in fields:
        a = ranges["A"][field]
        b = ranges["B"][field]

        if a["min"] is None or b["min"] is None:
            alerts.append(
                f"Missing reference measurements: {field}"
            )
            continue

        if a["max"] < b["min"] or b["max"] < a["min"]:
            alerts.append(
                f"NON-OVERLAPPING RANGES: {field}. "
                "The two matched test groups differ "
                "in their observed ranges."
            )

    if (
        scenarios["A"].get("support_level") == "WEAK_MATCH"
        or scenarios["B"].get("support_level") == "WEAK_MATCH"
    ):
        alerts.append(
            "WEAK SUPPORT: At least one scenario "
            "is poorly matched to NASA observations."
        )

    return {
        "reference_ranges": ranges,
        "alerts": alerts,
        "causal_claim_supported": False,
        "note": (
            "Range overlap does not establish controlled "
            "comparability or causal validity."
        )
    }
'@
W 'backend/app/lab/scientific_explainer.py' @'

from . import virtual_lab_engine as lab
from . import risk_assessment as ra

LIMITATIONS = [
    "Based only on NASA PSI-69 droplet combustion tests (Methanol and Heptane).",
    "Values come from the nearest NASA tests; this is not a physical simulation or a prediction.",
    "Associations are descriptive and do not prove cause and effect.",
    "The Low / Medium / High level is a relative indicator chosen by our team, not a validated fire-risk model.",
]

_SUPPORT = {
    "CLOSE_MATCH": "There are NASA tests very close to these inputs, so the result is well supported.",
    "APPROXIMATE_MATCH": "The closest NASA tests are only roughly similar to these inputs, so treat the result with caution.",
    "WEAK_MATCH": "No NASA test is close to these inputs, so the result is only weakly supported.",
}

def explain_scenario(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel, k=5):
    res = lab.run_scenario(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel, k)
    if res["status"] != "OK":
        return {"status": "REJECTED",
                "explanation": ["These inputs cannot be explained: " + "; ".join(res["errors"])],
                "limitations": LIMITATIONS}

    s = res["summary"]
    bt = s["burn_time_s"]
    ids = [m["test_id"] for m in res["matched_tests"]]
    lines = [
        f"Scenario: {fuel}, oxygen {o2_fraction * 100:.1f}%, pressure {pressure_mmhg:g} mmHg, "
        f"droplet diameter {droplet_diameter_mm:g} mm.",
        f"The {s['tests_used']} closest NASA tests ({', '.join(ids)}) had burn times from "
        f"{bt['min']} to {bt['max']} s, with a median of {bt['median']} s.",
        _SUPPORT[res["support_level"]],
    ]

    a = ra.assess_scenario(o2_fraction, pressure_mmhg, droplet_diameter_mm, fuel, k)
    if a["level"] == "NOT_ASSESSED":
        lines.append("Flame persistence was not classified because the evidence is not strong enough.")
    else:
        b = a["basis"]
        lines.append(f"Relative flame persistence: {a['level']} compared with the other NASA {fuel} tests "
                     f"(low up to {b['fuel_low_threshold_s']} s, high from {b['fuel_high_threshold_s']} s).")
        top = a["influencing_factors"][0] if a["influencing_factors"] else None
        if top:
            lines.append(top["description"][0].upper() + top["description"][1:] + f" (Spearman r = {top['spearman_r']}).")
            if top["variable"] == "droplet_diameter_mm":
                lines.append("Because droplet diameter has the strongest association, this level mostly "
                             "reflects droplet size rather than oxygen or pressure.")
    return {"status": "OK", "explanation": lines, "support_level": res["support_level"],
            "matched_test_ids": ids, "limitations": LIMITATIONS}


def explain_comparison(a, b, k=5):
    c = lab.compare_scenarios(a, b, k)
    if c["status"] != "OK":
        return {"status": "REJECTED",
                "explanation": ["The comparison cannot be made because at least one scenario was rejected."],
                "limitations": LIMITATIONS}

    d = c["inputs_that_differ"]
    lines = []
    if not d:
        lines.append("The two scenarios have identical inputs.")
    else:
        lines.append("The scenarios differ in: " + ", ".join(d) + ".")
    lines.append(f"Median burn time in the nearest NASA tests: {c['burn_time_median_a']} s (A) and "
                 f"{c['burn_time_median_b']} s (B), a difference of {c['difference_b_minus_a']} s.")
    for name, r in (("A", c["scenario_a"]), ("B", c["scenario_b"])):
        lines.append(f"Scenario {name}: " + _SUPPORT[r["support_level"]])
    if len(d) == 1:
        lines.append(f"Only {d[0]} differs, but this is still a descriptive comparison of different NASA tests, "
                     "not proof that this variable caused the difference.")
    elif len(d) > 1:
        lines.append("More than one input differs, so the difference cannot be attributed to a single variable.")
    return {"status": "OK", "explanation": lines, "warnings": c["warnings"], "limitations": LIMITATIONS}
'@
W 'backend/app/lab/scientific_intelligence_report.json' @'
{
  "project": "FlameGuard X",
  "module": "Scientific Intelligence Core",
  "status": "PRECOMPUTED_ANALYSIS",
  "source": "NASA PSI-69",
  "discovery": {
    "candidate_pairs": 628,
    "top_findings": [
      {
        "fuel": "Heptane",
        "test_a": "PSI-69-T050",
        "test_b": "PSI-69-T205",
        "condition_distance": 0.0934,
        "burn_time_a": 8.4,
        "burn_time_b": 24.0,
        "burn_time_difference": 15.6,
        "exploration_score": 14.267422718126944
      },
      {
        "fuel": "Heptane",
        "test_a": "PSI-69-T050",
        "test_b": "PSI-69-T204",
        "condition_distance": 0.0991,
        "burn_time_a": 8.4,
        "burn_time_b": 23.9,
        "burn_time_difference": 15.5,
        "exploration_score": 14.102447457010282
      },
      {
        "fuel": "Methanol",
        "test_a": "PSI-69-T077",
        "test_b": "PSI-69-T215",
        "condition_distance": 0.2719,
        "burn_time_a": 8.5,
        "burn_time_b": 26.0,
        "burn_time_difference": 17.5,
        "exploration_score": 13.75894331315355
      },
      {
        "fuel": "Methanol",
        "test_a": "PSI-69-T215",
        "test_b": "PSI-69-T217",
        "condition_distance": 0.2186,
        "burn_time_a": 26.0,
        "burn_time_b": 9.5,
        "burn_time_difference": 16.5,
        "exploration_score": 13.540128015755789
      },
      {
        "fuel": "Heptane",
        "test_a": "PSI-69-T049",
        "test_b": "PSI-69-T204",
        "condition_distance": 0.1475,
        "burn_time_a": 8.6,
        "burn_time_b": 23.9,
        "burn_time_difference": 15.3,
        "exploration_score": 13.333333333333334
      },
      {
        "fuel": "Heptane",
        "test_a": "PSI-69-T049",
        "test_b": "PSI-69-T205",
        "condition_distance": 0.1705,
        "burn_time_a": 8.6,
        "burn_time_b": 24.0,
        "burn_time_difference": 15.4,
        "exploration_score": 13.156770610850064
      },
      {
        "fuel": "Methanol",
        "test_a": "PSI-69-T065",
        "test_b": "PSI-69-T077",
        "condition_distance": 0.2122,
        "burn_time_a": 24.3,
        "burn_time_b": 8.5,
        "burn_time_difference": 15.8,
        "exploration_score": 13.034152780069295
      },
      {
        "fuel": "Heptane",
        "test_a": "PSI-69-T205",
        "test_b": "PSI-69-T230",
        "condition_distance": 0.1275,
        "burn_time_a": 24.0,
        "burn_time_b": 9.6,
        "burn_time_difference": 14.4,
        "exploration_score": 12.771618625277164
      },
      {
        "fuel": "Heptane",
        "test_a": "PSI-69-T204",
        "test_b": "PSI-69-T230",
        "condition_distance": 0.1519,
        "burn_time_a": 23.9,
        "burn_time_b": 9.6,
        "burn_time_difference": 14.3,
        "exploration_score": 12.414272072228494
      },
      {
        "fuel": "Methanol",
        "test_a": "PSI-69-T151",
        "test_b": "PSI-69-T158",
        "condition_distance": 0.8197,
        "burn_time_a": 31.3,
        "burn_time_b": 10.1,
        "burn_time_difference": 21.2,
        "exploration_score": 11.65027202286091
      }
    ],
    "interpretation": "Exploratory candidates requiring scientific validation, not confirmed discoveries."
  },
  "quantitative_intelligence": {
    "case": "Heptane matched-condition investigation",
    "sample_size": 6,
    "experiments": [
      {
        "test_id": "PSI-69-T050",
        "pressure_mmhg": 770.1,
        "droplet_diameter_mm": 3.57,
        "burn_time_s": 8.4
      },
      {
        "test_id": "PSI-69-T049",
        "pressure_mmhg": 764.9,
        "droplet_diameter_mm": 3.46,
        "burn_time_s": 8.6
      },
      {
        "test_id": "PSI-69-T230",
        "pressure_mmhg": 769.2,
        "droplet_diameter_mm": 3.65,
        "burn_time_s": 9.6
      },
      {
        "test_id": "PSI-69-T047",
        "pressure_mmhg": 770.1,
        "droplet_diameter_mm": 3.36,
        "burn_time_s": 17.1
      },
      {
        "test_id": "PSI-69-T204",
        "pressure_mmhg": 756.5,
        "droplet_diameter_mm": 3.56,
        "burn_time_s": 23.9
      },
      {
        "test_id": "PSI-69-T205",
        "pressure_mmhg": 757.3,
        "droplet_diameter_mm": 3.58,
        "burn_time_s": 24.0
      }
    ],
    "median_burn_time_s": 13.350000000000001,
    "burn_time_range_s": 15.6,
    "bootstrap_median_interval_95_s": [
      8.5,
      23.95
    ],
    "bootstrap_caveat": "Exploratory interval based on six observations; assumes independent comparable measurements."
  },
  "mission_evidence": {
    "project": "FlameGuard X",
    "module": "Mission Evidence Intelligence",
    "source": "NASA PSI-69",
    "research_question": "How consistent are recorded heptane droplet burn times under similar experimental conditions?",
    "evidence": {
      "matched_experiments": 6,
      "test_ids": [
        "PSI-69-T050",
        "PSI-69-T049",
        "PSI-69-T230",
        "PSI-69-T047",
        "PSI-69-T204",
        "PSI-69-T205"
      ],
      "median_burn_time_s": 13.350000000000001,
      "burn_time_range_s": 15.6,
      "missing_extinction_measurements": 3
    },
    "evidence_readiness": "LIMITED",
    "evidence_flags": [
      "SMALL_SAMPLE",
      "HIGH_OUTCOME_VARIABILITY",
      "MISSING_EXTINCTION_MEASUREMENTS"
    ],
    "causal_claim_supported": false,
    "mission_relevance": "Highlights uncertainty in microgravity droplet combustion measurements relevant to combustion research and future spacecraft fire-safety studies.",
    "limitations": [
      "Small observational sample",
      "Possible unrecorded experimental differences",
      "No validated spacecraft fire-risk prediction",
      "No demonstrated causal explanation"
    ],
    "recommended_next_experiment": "Repeat heptane droplet combustion measurements with tightly controlled oxygen, pressure, droplet diameter, gas composition and consistent burn-time and extinction reporting.",
    "safety_decision": "NOT SUFFICIENT FOR SPACECRAFT SAFETY CERTIFICATION"
  }
}
'@
W 'backend/app/lab/scientific_validation_engine.py' @'
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
'@
W 'backend/app/lab/virtual_lab_engine.py' @'
import os

import numpy as np
import pandas as pd

LAB = pd.read_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "nasa_lab_data.csv"))
LAB = LAB[LAB["complete_for_lab"] & LAB["composition_ok"]].reset_index(drop=True)

INPUTS = ["o2_fraction", "pressure_mmhg", "droplet_diameter_mm"]
RANGES = {c: {"min": float(LAB[c].min()), "max": float(LAB[c].max())} for c in INPUTS}
SPAN = {c: RANGES[c]["max"] - RANGES[c]["min"] for c in INPUTS}
FUELS = sorted(LAB["material"].dropna().unique())

# عتبات محافظة اخترناها نحن، مش من NASA | Conservative thresholds chosen by us, not from NASA
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
'@
W 'backend/tests/test_lab.py' @'

import os, sys

from app.lab import virtual_lab_engine as lab
from app.lab import risk_assessment as ra
from app.lab import lab_api

A = dict(o2_fraction=0.21, pressure_mmhg=760, droplet_diameter_mm=1.8, fuel="Methanol")

def test_valid_scenario_is_ok():
    r = lab.run_scenario(**A)
    assert r["status"] == "OK" and r["support_level"] == "CLOSE_MATCH"
    assert r["summary"]["tests_used"] == 5

def test_oxygen_out_of_range_rejected():
    r = lab.run_scenario(**{**A, "o2_fraction": 0.50})
    assert r["status"] == "REJECTED" and "o2_fraction" in r["errors"][0]

def test_pressure_and_droplet_out_of_range_rejected():
    assert lab.run_scenario(**{**A, "pressure_mmhg": 100})["status"] == "REJECTED"
    assert lab.run_scenario(**{**A, "droplet_diameter_mm": 10})["status"] == "REJECTED"

def test_unsupported_fuel_rejected():
    assert lab.run_scenario(**{**A, "fuel": "Ethanol"})["status"] == "REJECTED"

def test_non_numeric_input_rejected():
    assert lab.run_scenario(**{**A, "o2_fraction": "abc"})["status"] == "REJECTED"

def test_weak_match_is_not_assessed():
    r = ra.assess_scenario(**{**A, "o2_fraction": 0.30})
    assert r["level"] == "NOT_ASSESSED"

def test_risk_score_is_never_calculated():
    assert ra.assess_scenario(**A)["fire_risk_score"] == "not calculated"

def test_compare_flags_different_fuel():
    c = lab.compare_scenarios(A, {**A, "fuel": "Heptane"})
    assert "fuel" in c["inputs_that_differ"]
    assert any("not like-for-like" in w for w in c["warnings"])

def test_compare_flags_multiple_differences():
    c = lab.compare_scenarios(A, {**A, "fuel": "Heptane", "o2_fraction": 0.25})
    assert any("single variable" in w for w in c["warnings"])

def test_api_single_and_compare():
    r1 = lab_api.lab_response({"mode": "single", "scenario_a": A})
    assert r1["status"] == "OK" and r1["scenario_a"]["flame_data"]["time_series_available"] is False
    r2 = lab_api.lab_response({"mode": "compare", "scenario_a": A,
                               "scenario_b": {**A, "droplet_diameter_mm": 2.6}})
    assert r2["status"] == "OK" and "comparison" in r2

def test_api_rejected_scenario_has_no_flame_data():
    r = lab_api.lab_response({"mode": "single", "scenario_a": {**A, "o2_fraction": 0.5}})
    assert r["scenario_a"]["result"]["status"] == "REJECTED"
    assert r["scenario_a"]["flame_data"] is None

def test_api_bad_requests():
    assert lab_api.lab_response({"mode": "x"})["status"] == "BAD_REQUEST"
    assert lab_api.lab_response({"mode": "single", "scenario_a": {"fuel": "Methanol"}})["status"] == "BAD_REQUEST"
    assert lab_api.lab_response({"mode": "compare", "scenario_a": A})["status"] == "BAD_REQUEST"

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print("PASS", t.__name__)
        except AssertionError as e:
            failed += 1
            print("FAIL", t.__name__, e)
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
'@
W 'src/lib/lab.ts' @'
// Data access for the Virtual Lab page (FlameGuard X). Kept separate from api.ts on purpose.

const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export interface Scenario {
  o2_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  fuel: string
}

export interface LabOptions {
  fuels: string[]
  ranges: Record<'o2_fraction' | 'pressure_mmhg' | 'droplet_diameter_mm', { min: number; max: number }>
  tests: number
}

export interface MatchedTest {
  test_id: string
  distance: number
  o2_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  burn_time_s: number
}

export interface RunResult {
  status: string
  errors?: string[]
  support_level?: string
  nearest_distance?: number
  summary?: {
    tests_used: number
    burn_time_s: { median: number; min: number; max: number }
    extinction_diameter_mm_median: number | null
  }
  matched_tests?: MatchedTest[]
  warnings?: string[]
}

export interface Risk {
  level: string
  reason?: string
  indicator?: string
  basis?: { matched_median_burn_time_s: number; fuel_low_threshold_s: number; fuel_high_threshold_s: number }
  influencing_factors?: { variable: string; spearman_r: number; description: string }[]
}

export interface ScenarioBlock {
  inputs: Scenario
  result: RunResult
  risk_indicator: Risk
  explanation: { explanation: string[] }
  flame_data: { flame_duration_s: number; initial_droplet_diameter_mm: number; extinction_diameter_mm: number | null; note: string } | null
}

export interface LabReply {
  status: string
  errors?: string[]
  mode?: 'single' | 'compare'
  scenario_a?: ScenarioBlock
  scenario_b?: ScenarioBlock
  comparison?: {
    inputs_that_differ: string[]
    burn_time_median_a: number
    burn_time_median_b: number
    difference_b_minus_a: number
    warnings: string[]
  }
  comparison_explanation?: { explanation: string[] }
  limitations?: string[]
}

export interface DetectiveReply {
  status: string
  verdict: string
  reason: string
  changed_variables?: string[]
  warnings?: string[]
  research_gap?: string
  scientific_conclusion?: string
  evidence?: { scenario_a_test_ids: string[]; scenario_b_test_ids: string[]; burn_time_a_s: number; burn_time_b_s: number; difference_s: number }
  actual_evidence_audit?: { alerts: string[]; note: string }
}

export interface CaseReply {
  status: string
  case_id: string
  case_title: string
  case_question: string
  case_status: string
  final_message: string
  scenario_a: Scenario
  scenario_b: Scenario
  investigation: DetectiveReply
  next_experiment: {
    status: string
    research_question?: string
    variable_to_change?: string
    variables_to_control?: string[]
    suggested_design?: string
    measurements?: string[]
    scientific_limitations?: string
    reason?: string
  }
}

export interface CombustionExplanation {
  fuel: string
  oxygen_percentage: number
  pressure_mmhg: number
  oxygen_partial_pressure_mmhg: number
  droplet_diameter_mm: number
  scientific_explanation: {
    fuel_role: string
    oxygen_pressure_interaction: string
    pressure_role: string
    droplet_role: string
    microgravity_role: string
  }
  why_review_before_repeating: string
  evidence_level: string
  limitations: string[]
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = 'Server error ' + res.status
    try {
      const j = (await res.json()) as { detail?: unknown }
      if (typeof j.detail === 'string') detail = j.detail
    } catch {
      /* keep the generic message */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export const getLabOptions = () => call<LabOptions>('/api/lab/options')
export const runLab = (scenario_a: Scenario, scenario_b?: Scenario) =>
  call<LabReply>('/api/lab', scenario_b ? { mode: 'compare', scenario_a, scenario_b } : { mode: 'single', scenario_a })
export const runDetective = (scenario_a: Scenario, scenario_b: Scenario) =>
  call<DetectiveReply>('/api/detective', { scenario_a, scenario_b })
export const getCase = () => call<CaseReply>('/api/crime-scene/oxygen-paradox')
export const getExplanation = (s: Scenario) =>
  call<CombustionExplanation>(
    '/api/combustion-explanation?' +
      new URLSearchParams({
        fuel: s.fuel,
        o2_fraction: String(s.o2_fraction),
        pressure_mmhg: String(s.pressure_mmhg),
        droplet_diameter_mm: String(s.droplet_diameter_mm),
      }).toString(),
  )
'@
W 'src/pages/Lab.tsx' @'
import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FlaskConical, Loader2 } from 'lucide-react'
import {
  getCase,
  getExplanation,
  getLabOptions,
  runDetective,
  runLab,
} from '../lib/lab'
import type {
  CaseReply,
  CombustionExplanation,
  DetectiveReply,
  LabOptions,
  LabReply,
  Scenario,
  ScenarioBlock,
} from '../lib/lab'

const mono = 'font-mono uppercase tracking-[0.25em]'

type Tab = 'lab' | 'detective' | 'case'
const TABS: { id: Tab; label: string }[] = [
  { id: 'lab', label: 'Virtual lab' },
  { id: 'detective', label: 'Detective' },
  { id: 'case', label: 'Case file' },
]

const FALLBACK: LabOptions = {
  fuels: ['Heptane', 'Methanol'],
  ranges: {
    o2_fraction: { min: 0.12, max: 0.34 },
    pressure_mmhg: { min: 526.3, max: 2319.7 },
    droplet_diameter_mm: { min: 1.13, max: 4.67 },
  },
  tests: 0,
}

const DEFAULT_A: Scenario = { o2_fraction: 0.21, pressure_mmhg: 760, droplet_diameter_mm: 1.8, fuel: 'Methanol' }
const DEFAULT_B: Scenario = { ...DEFAULT_A, droplet_diameter_mm: 2.4 }

const FIELD_LABEL: Record<string, string> = {
  o2_fraction: 'Oxygen',
  pressure_mmhg: 'Pressure',
  droplet_diameter_mm: 'Droplet diameter',
  fuel: 'Fuel',
}

const SUPPORT_COLOR: Record<string, string> = {
  CLOSE_MATCH: '#34D399',
  APPROXIMATE_MATCH: '#FFB347',
  WEAK_MATCH: '#F87171',
}
const LEVEL_COLOR: Record<string, string> = {
  LOW: '#34D399',
  MEDIUM: '#FFB347',
  HIGH: '#FF6B2C',
  NOT_ASSESSED: '#8A94A8',
}
const VERDICT_COLOR: Record<string, string> = {
  COMPARABLE: '#34D399',
  CONFOUNDED: '#FFB347',
  INSUFFICIENT_EVIDENCE: '#F87171',
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className={`${mono} rounded-full border px-2.5 py-1 text-[9px]`}
      style={{ color, borderColor: color + '66', background: color + '1A' }}
    >
      {text.replace(/_/g, ' ')}
    </span>
  )
}

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  const id = useId()
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className={`${mono} text-[10px] text-muted`}>
          {label}
        </label>
        <span className="text-sm font-semibold">
          {display} <span className="text-xs font-normal text-muted">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-flame"
      />
    </div>
  )
}

function ScenarioForm({
  title,
  value,
  options,
  onChange,
}: {
  title: string
  value: Scenario
  options: LabOptions
  onChange: (s: Scenario) => void
}) {
  const id = useId()
  const r = options.ranges
  const set = <K extends keyof Scenario>(k: K, v: Scenario[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="glass space-y-5 p-5">
      <p className={`${mono} text-[11px] text-flame`}>{title}</p>
      <div>
        <label htmlFor={id} className={`${mono} mb-1.5 block text-[10px] text-muted`}>
          Fuel
        </label>
        <select
          id={id}
          value={value.fuel}
          onChange={(e) => set('fuel', e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-ink outline-none [color-scheme:dark] focus:border-flame"
        >
          {options.fuels.map((f) => (
            <option key={f} value={f} className="bg-panel">
              {f}
            </option>
          ))}
        </select>
      </div>
      <Slider
        label="Oxygen"
        unit="%"
        value={value.o2_fraction}
        min={r.o2_fraction.min}
        max={r.o2_fraction.max}
        step={0.005}
        display={(value.o2_fraction * 100).toFixed(1)}
        onChange={(v) => set('o2_fraction', v)}
      />
      <Slider
        label="Pressure"
        unit="mmHg"
        value={value.pressure_mmhg}
        min={Math.floor(r.pressure_mmhg.min)}
        max={Math.ceil(r.pressure_mmhg.max)}
        step={1}
        display={String(Math.round(value.pressure_mmhg))}
        onChange={(v) => set('pressure_mmhg', v)}
      />
      <Slider
        label="Droplet diameter"
        unit="mm"
        value={value.droplet_diameter_mm}
        min={r.droplet_diameter_mm.min}
        max={r.droplet_diameter_mm.max}
        step={0.01}
        display={value.droplet_diameter_mm.toFixed(2)}
        onChange={(v) => set('droplet_diameter_mm', v)}
      />
    </div>
  )
}

function Notes({ title, lines }: { title: string; lines?: string[] }) {
  if (!lines || lines.length === 0) return null
  return (
    <div>
      <p className={`${mono} mb-2 text-[10px] text-muted`}>{title}</p>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink/90">
        {lines.map((l, i) => (
          <li key={i} className="border-l border-white/10 pl-3">
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={`${mono} mb-1 text-[9px] text-muted`}>{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function Explain({ scenario }: { scenario: Scenario }) {
  const [data, setData] = useState<CombustionExplanation | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setBusy(true)
    setErr('')
    try {
      setData(await getExplanation(scenario))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load the explanation.')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div>
        <button
          onClick={load}
          disabled={busy}
          className={`${mono} flex cursor-pointer items-center gap-2 border border-flame/60 px-4 py-2.5 text-[10px] text-ink hover:bg-flame/10 disabled:cursor-wait disabled:opacity-60`}
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          Explain the physics
        </button>
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
      </div>
    )
  }
  const x = data.scientific_explanation
  const rows: [string, string][] = [
    ['Fuel', x.fuel_role],
    ['Oxygen and pressure', x.oxygen_pressure_interaction],
    ['Pressure', x.pressure_role],
    ['Droplet size', x.droplet_role],
    ['Microgravity', x.microgravity_role],
  ]
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className={`${mono} text-[10px] text-muted`}>Physics background</p>
        <Pill text={data.evidence_level} color="#4CC9F0" />
      </div>
      <p className="text-xs text-muted">
        Oxygen partial pressure: <span className="font-semibold text-ink">{data.oxygen_partial_pressure_mmhg} mmHg</span>{' '}
        (reference 21% at 760 mmHg = 159.6 mmHg)
      </p>
      <dl className="space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className={`${mono} text-[9px] text-muted`}>{k}</dt>
            <dd className="leading-relaxed text-ink/90">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">{data.why_review_before_repeating}</p>
      <Notes title="Limitations" lines={data.limitations} />
    </div>
  )
}

function BlockView({ name, block }: { name: string; block: ScenarioBlock }) {
  const res = block.result
  if (res.status !== 'OK' || !res.summary) {
    return (
      <div className="glass p-5" role="alert">
        <p className={`${mono} mb-2 text-[11px] text-flame`}>{name}</p>
        <p className="mb-2 text-sm font-semibold">These inputs were rejected</p>
        <ul className="space-y-1 text-sm text-muted">
          {(res.errors ?? []).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }
  const bt = res.summary.burn_time_s
  const risk = block.risk_indicator
  return (
    <motion.div className="glass space-y-5 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`${mono} text-[11px] text-flame`}>{name}</p>
        <div className="flex flex-wrap gap-2">
          {res.support_level && <Pill text={res.support_level} color={SUPPORT_COLOR[res.support_level] ?? '#8A94A8'} />}
          <Pill text={'Persistence ' + risk.level} color={LEVEL_COLOR[risk.level] ?? '#8A94A8'} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
        <Stat label="Median burn" value={bt.median + ' s'} />
        <Stat label="Range" value={bt.min + ' - ' + bt.max + ' s'} />
        <Stat label="Tests used" value={String(res.summary.tests_used)} />
      </div>

      <Notes title="Explanation" lines={block.explanation.explanation} />

      {risk.influencing_factors && risk.influencing_factors.length > 0 && (
        <div>
          <p className={`${mono} mb-2 text-[10px] text-muted`}>What goes with burn time (NASA tests)</p>
          <div className="space-y-2">
            {risk.influencing_factors.map((f) => (
              <div key={f.variable} className="flex items-center gap-3 text-xs">
                <span className="w-32 shrink-0 text-muted">{FIELD_LABEL[f.variable] ?? f.variable}</span>
                <div className="relative h-1.5 flex-1 rounded bg-white/10">
                  <div
                    className="absolute top-0 h-full rounded bg-flame"
                    style={{
                      width: Math.abs(f.spearman_r) * 50 + '%',
                      left: f.spearman_r >= 0 ? '50%' : 50 - Math.abs(f.spearman_r) * 50 + '%',
                    }}
                  />
                  <div className="absolute top-[-3px] left-1/2 h-3 w-px bg-white/40" />
                </div>
                <span className="w-12 text-right font-mono">{f.spearman_r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {res.matched_tests && (
        <div>
          <p className={`${mono} mb-2 text-[10px] text-muted`}>Nearest NASA tests</p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[28rem] text-left text-xs">
              <thead className="text-muted">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 font-normal">Test</th>
                  <th className="px-3 py-2 font-normal">O2</th>
                  <th className="px-3 py-2 font-normal">mmHg</th>
                  <th className="px-3 py-2 font-normal">Drop mm</th>
                  <th className="px-3 py-2 font-normal">Burn s</th>
                </tr>
              </thead>
              <tbody>
                {res.matched_tests.map((t) => (
                  <tr key={t.test_id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-mono text-flame">{t.test_id}</td>
                    <td className="px-3 py-2">{(t.o2_fraction * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2">{t.pressure_mmhg}</td>
                    <td className="px-3 py-2">{t.droplet_diameter_mm}</td>
                    <td className="px-3 py-2">{t.burn_time_s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Notes title="Warnings" lines={res.warnings} />
      <Explain scenario={block.inputs} />
    </motion.div>
  )
}

function DetectiveView({ d }: { d: DetectiveReply }) {
  const color = VERDICT_COLOR[d.verdict] ?? '#8A94A8'
  return (
    <motion.div className="glass space-y-5 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center gap-3">
        <p className={`${mono} text-[11px] text-flame`}>Verdict</p>
        <Pill text={d.verdict} color={color} />
      </div>
      <p className="text-sm leading-relaxed">{d.reason}</p>
      {d.evidence && (
        <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <Stat label="Burn A" value={d.evidence.burn_time_a_s + ' s'} />
          <Stat label="Burn B" value={d.evidence.burn_time_b_s + ' s'} />
          <Stat label="Difference" value={d.evidence.difference_s + ' s'} />
        </div>
      )}
      <Notes title="Alerts" lines={d.warnings} />
      <Notes title="Evidence audit" lines={d.actual_evidence_audit?.alerts} />
      {d.scientific_conclusion && <p className="text-sm text-muted">{d.scientific_conclusion}</p>}
      {d.research_gap && <p className="text-sm text-muted">{d.research_gap}</p>}
    </motion.div>
  )
}

function CaseView({ c }: { c: CaseReply }) {
  const n = c.next_experiment
  return (
    <div className="space-y-6">
      <motion.div className="glass space-y-3 p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`${mono} text-[11px] text-flame`}>Case {c.case_id}</p>
          <Pill text={c.case_status} color="#FFB347" />
        </div>
        <h2 className="text-2xl font-bold">{c.case_title}</h2>
        <p className="text-sm text-muted">{c.case_question}</p>
        <p className="text-sm leading-relaxed">{c.final_message}</p>
      </motion.div>
      <DetectiveView d={c.investigation} />
      {n.status === 'PROPOSED' && (
        <div className="glass space-y-4 p-6">
          <p className={`${mono} text-[11px] text-flame`}>Proposed next experiment</p>
          <p className="text-sm font-semibold">{n.research_question}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={`${mono} mb-2 text-[10px] text-muted`}>Change</p>
              <p className="text-sm">{FIELD_LABEL[n.variable_to_change ?? ''] ?? n.variable_to_change}</p>
            </div>
            <div>
              <p className={`${mono} mb-2 text-[10px] text-muted`}>Keep fixed</p>
              <p className="text-sm">{(n.variables_to_control ?? []).map((v) => FIELD_LABEL[v] ?? v).join(', ')}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink/90">{n.suggested_design}</p>
          <Notes title="Measure" lines={n.measurements} />
          <p className="text-xs text-muted">{n.scientific_limitations}</p>
        </div>
      )}
    </div>
  )
}

export default function Lab() {
  const [options, setOptions] = useState<LabOptions>(FALLBACK)
  const [tab, setTab] = useState<Tab>('lab')
  const [compare, setCompare] = useState(false)
  const [a, setA] = useState<Scenario>(DEFAULT_A)
  const [b, setB] = useState<Scenario>(DEFAULT_B)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [labReply, setLabReply] = useState<LabReply | null>(null)
  const [detReply, setDetReply] = useState<DetectiveReply | null>(null)
  const [caseReply, setCaseReply] = useState<CaseReply | null>(null)

  useEffect(() => {
    let alive = true
    getLabOptions()
      .then((o) => {
        if (alive) setOptions(o)
      })
      .catch(() => {
        /* keep the built-in ranges; the run button will show the real error */
      })
    return () => {
      alive = false
    }
  }, [])

  const switchTab = (t: Tab) => {
    setTab(t)
    setError('')
  }

  async function run() {
    setLoading(true)
    setError('')
    try {
      if (tab === 'lab') setLabReply(await runLab(a, compare ? b : undefined))
      else if (tab === 'detective') setDetReply(await runDetective(a, b))
      else setCaseReply(await getCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the backend. Is it running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  const twoForms = tab === 'detective' || (tab === 'lab' && compare)

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <p className={`${mono} mb-2 text-[10px] text-flame`}>FlameGuard X &middot; NASA PSI-69</p>
        <div className="mb-3 flex items-center gap-3">
          <FlaskConical className="text-flame" size={30} />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Virtual lab</h1>
        </div>
        <p className="mb-8 max-w-2xl text-sm text-muted">
          Pick conditions and see what the closest real NASA droplet-combustion tests recorded. This shows observed
          values from {options.tests || 'the'} NASA tests. It is not a simulation, a prediction or a fire-risk model.
        </p>

        <div className="mb-8 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`${mono} relative cursor-pointer rounded-full px-5 py-2.5 text-[10px] transition-colors ${
                tab === t.id ? 'text-space' : 'text-muted hover:text-ink'
              }`}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="lab-tab"
                  className="absolute inset-0 -z-0 rounded-full bg-flame"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'case' ? (
          <p className="mb-6 max-w-2xl text-sm text-muted">
            A ready-made investigation: did raising oxygen cause the change in burn time? The detective checks whether
            the NASA evidence is strong enough to say so.
          </p>
        ) : (
          <>
            {tab === 'lab' && (
              <label className={`${mono} mb-5 flex w-fit cursor-pointer items-center gap-2 text-[10px] text-muted`}>
                <input
                  type="checkbox"
                  checked={compare}
                  onChange={(e) => setCompare(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-flame"
                />
                Compare two scenarios
              </label>
            )}
            <div className={`mb-6 grid gap-6 ${twoForms ? 'md:grid-cols-2' : 'max-w-xl'}`}>
              <ScenarioForm title={twoForms ? 'Scenario A' : 'Scenario'} value={a} options={options} onChange={setA} />
              {twoForms && <ScenarioForm title="Scenario B" value={b} options={options} onChange={setB} />}
            </div>
          </>
        )}

        <button
          onClick={run}
          disabled={loading}
          className={`${mono} mb-8 flex cursor-pointer items-center gap-2 bg-flame px-7 py-3.5 text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.35)] disabled:cursor-wait disabled:opacity-70`}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {tab === 'case' ? 'Open the case file' : tab === 'detective' ? 'Investigate' : 'Run in the lab'}
        </button>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="err"
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {tab === 'lab' && labReply && (
          <div className="space-y-6">
            {labReply.status !== 'OK' ? (
              <p className="text-sm text-red-300">{(labReply.errors ?? []).join(' ')}</p>
            ) : (
              <>
                <div className={`grid gap-6 ${labReply.scenario_b ? 'md:grid-cols-2' : 'max-w-2xl'}`}>
                  {labReply.scenario_a && <BlockView name={labReply.scenario_b ? 'Scenario A' : 'Result'} block={labReply.scenario_a} />}
                  {labReply.scenario_b && <BlockView name="Scenario B" block={labReply.scenario_b} />}
                </div>
                {labReply.comparison && (
                  <div className="glass space-y-4 p-5">
                    <p className={`${mono} text-[11px] text-flame`}>Comparison</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Stat label="Median A" value={labReply.comparison.burn_time_median_a + ' s'} />
                      <Stat label="Median B" value={labReply.comparison.burn_time_median_b + ' s'} />
                      <Stat label="B minus A" value={labReply.comparison.difference_b_minus_a + ' s'} />
                    </div>
                    <Notes title="Explanation" lines={labReply.comparison_explanation?.explanation} />
                    <Notes title="Warnings" lines={labReply.comparison.warnings} />
                  </div>
                )}
                <Notes title="Limitations" lines={labReply.limitations} />
              </>
            )}
          </div>
        )}
        {tab === 'detective' && detReply && (
          <div className="max-w-3xl">
            {detReply.status === 'OK' ? (
              <DetectiveView d={detReply} />
            ) : (
              <div className="glass p-5 text-sm" role="alert">
                <p className="mb-1 font-semibold">{detReply.verdict}</p>
                <p className="text-muted">{detReply.reason}</p>
              </div>
            )}
          </div>
        )}
        {tab === 'case' && caseReply && (
          <div className="max-w-3xl">
            <CaseView c={caseReply} />
          </div>
        )}
      </div>
    </div>
  )
}
'@

# ---- add a "Lab" link to the navbar (only if it is not there yet) ----
$nav = Join-Path $root 'src/components/Navbar.tsx'
if (Test-Path $nav) {
  $txt = [System.IO.File]::ReadAllText($nav)
  if ($txt -notmatch "to:\s*'/lab'") {
    $anchor = "{ to: '/dashboard', label: 'Dashboard' },"
    if ($txt.Contains($anchor)) {
      $txt = $txt.Replace($anchor, $anchor + "`r`n  { to: '/lab', label: 'Lab' },")
      [System.IO.File]::WriteAllText($nav, $txt, $utf8)
      Write-Host 'Navbar: added the Lab link'
    } else {
      Write-Host "Navbar: could not find the Dashboard link, add { to: '/lab', label: 'Lab' } by hand." -ForegroundColor Yellow
    }
  } else { Write-Host 'Navbar: Lab link already there' }
}

# ---- check that the backend and the routes are wired ----
$main = [System.IO.File]::ReadAllText((Join-Path $root 'backend/app/main.py'))
if ($main -notmatch 'lab\.router') {
  Write-Host 'WARNING: backend/app/main.py does not include the lab router. Add these two lines:' -ForegroundColor Yellow
  Write-Host '  from .lab.router import router as lab_router'
  Write-Host '  app.include_router(lab_router)'
}
$routes = [System.IO.File]::ReadAllText((Join-Path $root 'src/AppRoutes.tsx'))
if ($routes -notmatch 'pages/Lab') {
  Write-Host "WARNING: src/AppRoutes.tsx has no Lab route. Add: import Lab from './pages/Lab'  and  <Route path=""/lab"" element={<Lab />} />" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'DONE. Restart the backend (dev.ps1 or start.bat), then open http://localhost:5173/lab' -ForegroundColor Green
Write-Host 'Backend check: http://localhost:8000/api/lab/options   Tests: cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_lab.py'
