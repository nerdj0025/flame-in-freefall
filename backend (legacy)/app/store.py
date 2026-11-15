import json
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "experiments.json"


def all_experiments() -> list[dict]:
    """Read the experiments. Swap this for a database query later if you want."""
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_experiment(exp_id: str) -> dict | None:
    for e in all_experiments():
        if e["id"].lower() == exp_id.lower():
            return e
    return None