# Flame in Freefall - backend

FastAPI server that serves your React front end and runs the FlameGuard retrieval/evidence engine from the notebook.

## 1. Run it

```bash
cd flame-backend
python -m venv .venv
.venv\Scripts\activate          # Windows   (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
# copy the NASA files into ./data  (see data/README.md)
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/health - it should say `"status": "ok"` and show the number of tests (534 for the real data).
Interactive docs: http://localhost:8000/docs

## 2. Connect the front end

In the front-end folder run `connect-backend.ps1` (from `frontend-patch/`). It uses the same format as your stage scripts. It switches `api.ts` to the real API and replaces the demo `auth.ts` with real login. Set `VITE_USE_MOCK=true` in `.env.development` to bring the fake data back.

## 3. API

| Route | Used by | Returns |
|---|---|---|
| `POST /chat` `{message, history}` | Assistant page | `{answer, sources[], followUps[]}`, `[n]` markers match source ids |
| `GET /experiments` | Dashboard | array, one record per NASA **test** |
| `GET /meta` | Dashboard | units of every numeric field |
| `POST /investigate` `{query, top_k}` | debugging / the notebook's full output | ranked tests, evidence, data quality, gaps |
| `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` | Login page | `{token, user}` |
| `GET /health` | you | data loaded? |

## How the AI part works (updated for the new model)

Three engines, picked automatically (`FF_AI_MODE`, see `.env.example`). If the chosen one fails, the next one answers, so the chat never dies in the middle of a demo.

| Mode | What runs | When |
|---|---|---|
| `remote` | your friend's `app.py` in Colab, reached through `FF_AI_URL` | easiest, nothing heavy to install here. Use `colab/serve_in_colab.py` |
| `local` | `app/flameguard_engine.py` (the new model, vendored) inside this backend | `pip install -r requirements-ai.txt` (PyTorch, big download; the first question downloads two small models). Needs the 5 data files in `data/` |
| `legacy` | `app/engine.py`, the old TF-IDF port | always works, no extra installs |

`GET /ai/status` says which one is active. `POST /ai/query {"query": "..."}` shows the model's raw output.

The new model returns **data, not sentences** (retrieved tests, a scientific analysis per experiment, warnings). `app/chat_v2.py` writes the answer from those numbers: every sentence carries a `[n]` source, tests link to the dashboard, and the "not fire risk / not causation" notes always appear. If your friend changes a field, that part is skipped or printed generically instead of crashing. The old engine still adds the NASA documentation claims (with web links) from `evidence.json`, because the new model no longer returns them.

**When your friend changes the model again:** replace `app/flameguard_engine.py` with her new file and re-apply the two edits listed at the top of it (`FF_DATA_DIR`, `to_numpy(copy=True)`), or just use `remote` mode and change nothing here. Run `python -m pytest` afterwards.

**Data file names (new engine):** `measurements*.csv` and a data-quality csv whose name contains `quality`, both in `data/` (sub folders are searched too). The quality file needs columns `issue_id, experiment_id, test_id, issue_type, variable, severity`.

## Known limits (read before the demo)

- **Legacy engine is the simple one.** The neural re-ranking and the PSI-25 / PSI-69 analyses live in the new model (`remote` or `local` mode), not in `app/engine.py`.
- **Dashboard mapping.** The real data has per-test measurements (oxygen, burn time, CO...), no flame-size time series, no "spread rate in mm/s". So the dashboard shows one card per test, with those variables as the numeric fields. KPI tiles for spread rate and peak temperature show "n/a", and the "flame over time" chart is empty. `gravityLevel` and `flameType` come from `experiments.json` if it has such keys (lists at the top of `adapters.py`), otherwise "unspecified".
- The home page says "50+ experiments, 12 fuels, 4 gravity levels"; the real data has 5 experiments. Update it before presenting.
- Login: users are stored in `data/users.db` (SQLite, salted PBKDF2 password hashes, signed 7-day tokens). Set `FF_SECRET` in production. The chat and dashboard routes are public.

## Tests

`python -m pytest` runs against a small fake dataset in the same format (`tests/make_fixture.py`); it does not use your real files.
