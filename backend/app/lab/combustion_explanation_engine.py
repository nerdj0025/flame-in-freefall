
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