
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