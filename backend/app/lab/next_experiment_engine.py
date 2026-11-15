
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