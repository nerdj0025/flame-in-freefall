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