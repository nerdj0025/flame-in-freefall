
from app.lab import virtual_lab_engine as lab
from app.lab import risk_assessment as ra
from app.lab import lab_api

A = dict(o2_fraction=0.21, pressure_mmhg=760, droplet_diameter_mm=1.8, fuel="Methanol")

def test_valid_scenario_is_ok():
    r = lab.run_scenario(**A)
    assert r["status"] == "OK" and r["support_level"] == "CLOSE_MATCH"
    assert r["summary"]["tests_used"] == 5

def test_oxygen_out_of_range_rejected():
    r = lab.run_scenario(**{**A, "o2_fraction": 0.50})
    assert r["status"] == "REJECTED" and "o2_fraction" in r["errors"][0]

def test_pressure_and_droplet_out_of_range_rejected():
    assert lab.run_scenario(**{**A, "pressure_mmhg": 100})["status"] == "REJECTED"
    assert lab.run_scenario(**{**A, "droplet_diameter_mm": 10})["status"] == "REJECTED"

def test_unsupported_fuel_rejected():
    assert lab.run_scenario(**{**A, "fuel": "Ethanol"})["status"] == "REJECTED"

def test_non_numeric_input_rejected():
    assert lab.run_scenario(**{**A, "o2_fraction": "abc"})["status"] == "REJECTED"

def test_weak_match_is_not_assessed():
    r = ra.assess_scenario(**{**A, "o2_fraction": 0.30})
    assert r["level"] == "NOT_ASSESSED"

def test_risk_score_is_never_calculated():
    assert ra.assess_scenario(**A)["fire_risk_score"] == "not calculated"

def test_compare_flags_different_fuel():
    c = lab.compare_scenarios(A, {**A, "fuel": "Heptane"})
    assert "fuel" in c["inputs_that_differ"]
    assert any("not like-for-like" in w for w in c["warnings"])

def test_compare_flags_multiple_differences():
    c = lab.compare_scenarios(A, {**A, "fuel": "Heptane", "o2_fraction": 0.25})
    assert any("single variable" in w for w in c["warnings"])

def test_api_single_and_compare():
    r1 = lab_api.lab_response({"mode": "single", "scenario_a": A})
    assert r1["status"] == "OK" and r1["scenario_a"]["flame_data"]["time_series_available"] is False
    r2 = lab_api.lab_response({"mode": "compare", "scenario_a": A,
                               "scenario_b": {**A, "droplet_diameter_mm": 2.6}})
    assert r2["status"] == "OK" and "comparison" in r2

def test_api_rejected_scenario_has_no_flame_data():
    r = lab_api.lab_response({"mode": "single", "scenario_a": {**A, "o2_fraction": 0.5}})
    assert r["scenario_a"]["result"]["status"] == "REJECTED"
    assert r["scenario_a"]["flame_data"] is None

def test_api_bad_requests():
    assert lab_api.lab_response({"mode": "x"})["status"] == "BAD_REQUEST"
    assert lab_api.lab_response({"mode": "single", "scenario_a": {"fuel": "Methanol"}})["status"] == "BAD_REQUEST"
    assert lab_api.lab_response({"mode": "compare", "scenario_a": A})["status"] == "BAD_REQUEST"

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print("PASS", t.__name__)
        except AssertionError as e:
            failed += 1
            print("FAIL", t.__name__, e)
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
