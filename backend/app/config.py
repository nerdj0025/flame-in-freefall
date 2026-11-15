import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    """Reads backend/.env (KEY=value lines) so you do not have to set Windows environment variables."""
    f = ROOT / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()
DATA_DIR = Path(os.getenv("FF_DATA_DIR", ROOT / "data"))
DB_PATH = Path(os.getenv("FF_DB_PATH", DATA_DIR / "users.db"))

# Front-end dev servers allowed to call this API (comma separated)
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "FF_CORS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]

# Used to sign login tokens. SET THIS in production.
SECRET = os.getenv("FF_SECRET", "")

# ---- AI model (the friend's FlameGuard X engine) -------------------------------------------
# FF_AI_MODE:  auto   = remote if FF_AI_URL is set, else local if installed, else legacy
#              remote = call the Colab/other server at FF_AI_URL   (POST {url}/query {"question": "..."})
#              local  = run app/flameguard_engine.py inside this backend (needs requirements-ai.txt)
#              legacy = the old TF-IDF engine (app/engine.py), no extra installs
AI_MODE = os.getenv("FF_AI_MODE", "auto").lower()
AI_URL = os.getenv("FF_AI_URL", "").rstrip("/")
AI_TIMEOUT = float(os.getenv("FF_AI_TIMEOUT", "60"))
