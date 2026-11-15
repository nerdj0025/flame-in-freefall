import json

import pytest
from fastapi.testclient import TestClient

from tests.make_fixture import build

A = {"o2_fraction": 0.21, "pressure_mmhg": 760, "droplet_diameter_mm": 1.8, "fuel": "Methanol"}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    build(tmp_path)
    monkeypatch.setenv("FF_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FF_DB_PATH", str(tmp_path / "users.db"))
    monkeypatch.setenv("FF_AI_MODE", "legacy")
    import importlib, sys
    for m in [k for k in sys.modules if k == "app.main" or k == "app.config"]:
        del sys.modules[m]
    main = importlib.import_module("app.main")
    return TestClient(main.app)


def test_config(client):
    r = client.get("/lab/config").json()
    assert r["fuels"] == ["Heptane", "Methanol"] and set(r["ranges"]) == {"o2_fraction", "pressure_mmhg", "droplet_diameter_mm"}


def test_single_and_compare(client):
    s = client.post("/lab/run", json={"mode": "single", "scenario_a": A})
    assert s.status_code == 200 and s.json()["scenario_a"]["result"]["support_level"] == "CLOSE_MATCH"
    c = client.post("/lab/run", json={"mode": "compare", "scenario_a": A, "scenario_b": {**A, "o2_fraction": 0.30}})
    body = c.json()
    assert body["comparison"]["inputs_that_differ"] == ["o2_fraction"]
    json.dumps(body, allow_nan=False)


def test_bad_request(client):
    r = client.post("/lab/run", json={"mode": "nope"})
    assert r.status_code == 400 and r.json()["status"] == "BAD_REQUEST"
