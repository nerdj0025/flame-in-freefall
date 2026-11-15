"""Builds a SMALL FAKE dataset with the same columns as the real NASA files, for tests only."""
import json
import random
from pathlib import Path

import pandas as pd


def build(folder: Path) -> None:
    random.seed(1)
    folder.mkdir(parents=True, exist_ok=True)
    rows = []
    mats = {"PSI-25": "100 micron PMMA film 2 cm wide", "PSI-26": "PMMA sphere 2 cm", "PSI-69": "cotton fabric strip"}
    n = 0
    for exp, mat in mats.items():
        for t in range(1, 9):
            tid = f"{exp}-T{t:03d}"
            vars_ = [("o2_initial_pct_vol", 18 + t, "% by volume"), ("o2_final_pct_vol", 17 + t, "% by volume"),
                     ("o2_initial_mole_fraction", (18 + t) / 100, "mole fraction"), ("burn_time_s", random.uniform(5, 40), "s"),
                     ("ambient_pressure_mmhg", 760.0, "mmHg"), ("total_frames_shot", 57, "frames"),
                     ("co_final_ppm", random.uniform(0, 20), "ppm")]
            for v, val, unit in vars_:
                flag = "suspect value" if (tid.endswith("T003") and v == "co_final_ppm") else None
                rows.append(dict(experiment_id=exp, test_id=tid, source_row=t + 1, test_label=f"B{t}",
                                 sample_id=100 + t, pi="X", test_date="2014-02-19", gmt_day_of_year=50,
                                 test_time_gmt=None, material=mat, variable=v, value=val, unit=unit,
                                 value_type="numeric", raw_value=str(val), quality_flag=flag, notes=None))
            rows.append(dict(experiment_id=exp, test_id=tid, source_row=t + 1, test_label=f"B{t}", sample_id=1,
                             pi="X", test_date=None, gmt_day_of_year=None, test_time_gmt=None, material=mat,
                             variable="fan_display", value=None, unit=None, value_type="text", raw_value="62",
                             quality_flag=None, notes=None))
    pd.DataFrame(rows).to_csv(folder / "measurements.csv", index=False)

    (folder / "experiments.json").write_text(json.dumps({"experiments": [
        {"experiment_id": "PSI-25", "title": "BASS-II", "gravity_level": "microgravity"},
        {"experiment_id": "PSI-26", "title": "BASS-II sphere"},
        {"experiment_id": "PSI-69", "title": "Cotton"}]}))
    (folder / "evidence.json").write_text(json.dumps({
        "sources": [{"source_id": "S1", "title": "BASS wind tunnel report", "url": "https://ntrs.nasa.gov/x.pdf"},
                    {"source_id": "S2", "title": "Cotton paper", "url": "[doc](https://example.org/c)"}],
        "evidence": [
            {"evidence_id": "EV-25-01", "experiment_id": "PSI-25", "source_id": "S1", "claim_type": "fact",
             "claim": "PMMA flame spread increased with higher oxygen concentration in the BASS wind tunnel.",
             "confidence": "medium", "needs_human_check": True, "caveats": "Experiment-level.", "linked_test_ids": []},
            {"evidence_id": "EV-25-02", "experiment_id": "PSI-25", "source_id": "S1", "claim_type": "fact",
             "claim": "Carbon monoxide rose during burns of thin films.", "confidence": "low",
             "needs_human_check": False, "linked_test_ids": ["PSI-25-T002"]},
            {"evidence_id": "EV-69-01", "experiment_id": "PSI-69", "source_id": "S2", "claim_type": "fact",
             "claim": "Cotton burned slower at low oxygen.", "confidence": "high", "needs_human_check": False}]}))
    pd.DataFrame([
        dict(issue_id="DQ-1", experiment_id="PSI-25", test_id=None, severity="low", issue_type="encoding_bom",
             variable=None, description="BOM", recommended_action="strip"),
        dict(issue_id="DQ-2", experiment_id="PSI-25", test_id="PSI-25-T003", severity="high",
             issue_type="suspect_value", variable="co_final_ppm", description="CO suspicious", recommended_action="check"),
    ]).to_csv(folder / "quality_report.csv", index=False)


if __name__ == "__main__":
    build(Path(__file__).parent / "fixture")
