
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