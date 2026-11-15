import json
from pathlib import Path

import pytest

from app.adapters import build_chat_reply, build_experiments
from app.engine import DataNotFound, FlameGuardEngine
from tests.make_fixture import build


@pytest.fixture(scope="module")
def engine(tmp_path_factory):
    d = tmp_path_factory.mktemp("data")
    build(d)
    return FlameGuardEngine(d)


def test_search_finds_pmma(engine):
    hits = engine.search("PMMA combustion oxygen")
    assert hits and "PMMA" in hits[0]["material"]


def test_explicit_experiment_scope(engine):
    hits = engine.search("PSI-69 oxygen", top_k=10)
    assert hits and {h["experiment_id"] for h in hits} == {"PSI-69"}


def test_evidence_scope(engine):
    p = engine.evidence_passport("PSI-25", "PSI-25-T002")
    scopes = {e["evidence_id"]: e["scope"] for e in p}
    assert scopes == {"EV-25-01": "experiment_general", "EV-25-02": "test_specific"}
    # evidence linked to another test is excluded
    assert "EV-25-02" not in {e["evidence_id"] for e in engine.evidence_passport("PSI-25", "PSI-25-T005")}


def test_url_cleaning(engine):
    assert engine.evidence_passport("PSI-69")[0]["source_url"] == "https://example.org/c"


def test_quality(engine):
    q = engine.quality_report("PSI-25", "PSI-25-T003")
    assert q["total_issues"] == 2 and q["high"] == 1


def test_experiments_contract(engine):
    records, units = build_experiments(engine)
    assert len(records) == 24
    r = next(x for x in records if x["id"] == "PSI-25-T003")
    for k in ("id", "title", "fuel", "gravityLevel", "flameType"):
        assert isinstance(r[k], str)
    assert r["gravityLevel"] == "microgravity" and r["oxygenPercent"] == 21
    assert abs(r["pressure"] - 101.3) < 0.1            # mmHg -> kPa
    assert "totalFramesShot" not in r                  # admin variable hidden
    assert "coFinalPpm" not in r                       # suspect value excluded
    assert r["qualityIssues"] == 1
    assert units["burnTimeS"] == "s"
    json.dumps(records, allow_nan=False)


def test_chat_contract(engine):
    reply = build_chat_reply(engine, "PMMA combustion oxygen", [])
    ids = {s["id"] for s in reply["sources"]}
    import re
    marks = {int(m) for m in re.findall(r"\[(\d+)\]", reply["answer"])}
    assert marks and marks <= ids                      # every [n] has a source
    assert ids == set(range(1, len(ids) + 1))
    assert all(("experimentId" in s) or ("url" in s) or s["snippet"] for s in reply["sources"])
    assert "not fire risk" in reply["answer"]
    json.dumps(reply, allow_nan=False)


def test_chat_no_match_and_followup(engine):
    r = build_chat_reply(engine, "zzzz qqqq", [])
    assert r["sources"] == [] and r["followUps"]
    r2 = build_chat_reply(engine, "and carbon?", [{"role": "user", "content": "PSI-25 oxygen"},
                                                   {"role": "assistant", "content": "..."}])
    assert r2["sources"]


def test_missing_data(tmp_path):
    with pytest.raises(DataNotFound):
        FlameGuardEngine(tmp_path)


def test_other_material_claims_dropped(engine):
    reply = build_chat_reply(engine, "PMMA combustion oxygen", [])
    assert "Cotton" not in reply["answer"]
