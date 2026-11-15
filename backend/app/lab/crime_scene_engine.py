
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