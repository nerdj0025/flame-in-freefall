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