
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