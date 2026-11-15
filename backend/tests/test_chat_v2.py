"""Tests for the new-model path: the adapter on sample output, and the friend's real engine file
running on the fake dataset (with the two neural models replaced by tiny stand-ins so no download is needed)."""
import importlib
import json
import re
import sys
import types

import numpy as np
import pytest

from app.chat_v2 import build_chat_reply_v2
from tests.make_fixture import build

SAMPLE_69 = {
    "user_query": "Analyze PSI-69: What is the relationship between oxygen concentration and burn time?",
    "requested_experiments": ["PSI-69"],
    "retrieved_evidence": [
        {"test_id": "PSI-69-T168", "experiment_id": "PSI-69", "score": 3.2,
         "snippet": "PSI-69 PSI-69-T168 material methanol. o initial mole fraction 0.21. burn time s 4.3 s"},
        {"test_id": "PSI-69-T020", "experiment_id": "PSI-69", "score": 2.1,
         "snippet": "PSI-69 PSI-69-T020 material heptane. burn time s 17.5 s"}],
    "scientific_analysis": {"PSI-69": {
        "analysis": "Oxygen concentration vs burn time", "complete_pairs_used": 268, "pearson_r": 0.336,
        "interpretation": "Descriptive linear association only.", "status": "AVAILABLE",
        "data_quality_summary": {"PRELIMINARY_ELIGIBLE": 1100, "NOT_ELIGIBLE": 300}}},
    "safety_warnings": ["Evidence claims in evidence.json require human review.",
                        "Causal or fire-risk/prediction claims are not supported by this system."],
}


def assert_contract(reply):
    ids = [s["id"] for s in reply["sources"]]
    assert ids == list(range(1, len(ids) + 1))
    marks = {int(m) for m in re.findall(r"\[(\d+)\]", reply["answer"])}
    assert marks <= set(ids)
    assert all(("experimentId" in s) or ("url" in s) or s["snippet"] for s in reply["sources"])
    json.dumps(reply, allow_nan=False)


def test_psi69_answer():
    r = build_chat_reply_v2(SAMPLE_69, SAMPLE_69["user_query"])
    assert_contract(r)
    assert "r = 0.34" in r["answer"] and "268" in r["answer"]
    assert "1100 of 1400" in r["answer"]
    assert "cannot prove causes" in r["answer"]
    assert {s["experimentId"] for s in r["sources"]} == {"PSI-69-T168", "PSI-69-T020"}


def test_limited_and_empty_and_unknown_shape():
    lim = {"requested_experiments": ["PSI-98"], "retrieved_evidence": [],
           "scientific_analysis": {"PSI-98": {"status": "LIMITED", "analysis": "Descriptive only; 2 tests."}}}
    r = build_chat_reply_v2(lim, "PSI-98")
    assert "limited data" in r["answer"]
    assert_contract(r)
    empty = build_chat_reply_v2({}, "zzz")
    assert empty["sources"] == [] and empty["followUps"]
    odd = {"scientific_analysis": {"PSI-5": {"status": "AVAILABLE", "results": {"foo": 1.5}, "analysis": "New"}}}
    assert "foo 1.5" in build_chat_reply_v2(odd, "x")["answer"]  # a changed shape is printed, not a crash


def test_gas_results():
    u = {"requested_experiments": ["PSI-25"], "retrieved_evidence": [], "scientific_analysis": {"PSI-25": {
        "status": "AVAILABLE", "analysis": "Paired", "results": {
            "O2": {"paired_measurements": 10, "median_change": -0.3, "increased": 1, "decreased": 8, "unit": "percentage points"}}}}}
    r = build_chat_reply_v2(u, "PSI-25")
    assert "O2 -0.3 percentage points" in r["answer"]


# ---------------- the friend's real engine file, on the fake dataset ----------------
class _FakeST:
    def __init__(self, *a, **k):
        pass

    @staticmethod
    def _vec(text):
        v = np.zeros(64)
        for w in re.findall(r"\w+", text.lower()):
            v[hash(w) % 64] += 1
        n = np.linalg.norm(v)
        return v / n if n else v

    def encode(self, texts, normalize_embeddings=True, show_progress_bar=False):
        return np.array([self._vec(t) for t in texts])


class _FakeCE:
    def __init__(self, *a, **k):
        pass

    def predict(self, pairs):
        return np.array([float(len(set(q.lower().split()) & set(d.lower().split()))) for q, d in pairs])


@pytest.fixture()
def fg(tmp_path, monkeypatch):
    build(tmp_path)
    fake = types.ModuleType("sentence_transformers")
    fake.SentenceTransformer, fake.CrossEncoder = _FakeST, _FakeCE
    monkeypatch.setitem(sys.modules, "sentence_transformers", fake)
    monkeypatch.setenv("FF_DATA_DIR", str(tmp_path))
    sys.modules.pop("app.flameguard_engine", None)
    return importlib.import_module("app.flameguard_engine")


def test_vendored_engine_end_to_end(fg):
    out = fg.flameguard_unified_query("PSI-25 oxygen and carbon monoxide changes")
    assert out["requested_experiments"] == ["PSI-25"]
    assert {e["experiment_id"] for e in out["retrieved_evidence"]} == {"PSI-25"}
    assert out["scientific_analysis"]["PSI-25"]["status"] == "AVAILABLE"
    reply = build_chat_reply_v2(json.loads(json.dumps(out, default=str)), "PSI-25 oxygen and carbon monoxide changes")
    assert_contract(reply)
    assert reply["sources"] and "PSI-25" in reply["answer"]


def test_local_provider(fg, tmp_path):
    from app.ai_provider import LocalProvider
    out = LocalProvider(tmp_path).query("PSI-69 oxygen concentration and burn time")
    assert out["requested_experiments"] == ["PSI-69"]
    json.dumps(out, allow_nan=False)


def test_remote_provider_down():
    from app.ai_provider import AIUnavailable, RemoteProvider
    with pytest.raises(AIUnavailable):
        RemoteProvider("http://127.0.0.1:9", 1).query("x")
