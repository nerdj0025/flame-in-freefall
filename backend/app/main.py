"""
Flame in Freefall API.   Run:  uvicorn app.main:app --reload --port 8000

  GET  /health        is the data loaded?
  GET  /experiments   dashboard data (array)
  GET  /meta          units for every numeric dashboard field
  POST /chat          assistant: {message, history} -> {answer, sources, followUps}
  GET  /ai/status     which AI engine is answering (new model remote/local, or legacy)
  POST /ai/query      raw output of the new model: {question} -> unified JSON (debugging)
  POST /investigate   raw FlameGuard result (ranked tests, evidence, quality, gaps)
  POST /auth/signup   POST /auth/login   GET /auth/me
"""
from __future__ import annotations

import logging
import threading
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import config
from .adapters import build_chat_reply, build_experiments, contextualise
from .ai_provider import AIUnavailable, make_provider
from .chat_v2 import build_chat_reply_v2
from .auth import AuthError, AuthStore
from .engine import DataNotFound, FlameGuardEngine, clean
from .lab.router import router as lab_router

log = logging.getLogger("flame")
app = FastAPI(title="Flame in Freefall API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(lab_router)

_lock = threading.Lock()
_state: dict = {"engine": None, "error": None, "experiments": None}
auth_store = AuthStore(config.DB_PATH, config.SECRET)
provider = make_provider()  # the friend's model (remote or local), or None = legacy engine


def get_engine() -> FlameGuardEngine:
    """Loads the NASA data on first use (a few seconds), then reuses it."""
    with _lock:
        if _state["engine"] is None and _state["error"] is None:
            try:
                _state["engine"] = FlameGuardEngine(config.DATA_DIR)
                log.info("FlameGuard ready: %d tests", len(_state["engine"].tests))
            except DataNotFound as e:
                _state["error"] = str(e)
            except Exception as e:  # bad file contents etc.
                log.exception("engine failed to load")
                _state["error"] = f"{type(e).__name__}: {e}"
    if _state["engine"] is None:
        raise HTTPException(503, f"Data not available. {_state['error']}")
    return _state["engine"]


@app.on_event("startup")
def warm_up() -> None:
    try:
        get_engine()
    except HTTPException:
        log.warning("Started without data: %s", _state["error"])
    log.warning("AI engine: %s", provider.name if provider else "legacy (old TF-IDF engine)")
    if provider is not None and provider.name == "local":
        # load the neural models in the background so the first question is not slow
        def _warm() -> None:
            try:
                provider.query("PSI-25 oxygen")
                log.warning("Local AI model ready")
            except AIUnavailable as exc:
                log.warning("Local AI model not available: %s", exc)

        threading.Thread(target=_warm, daemon=True).start()


@app.exception_handler(AuthError)
def auth_error(_, exc: AuthError):
    return JSONResponse({"detail": str(exc)}, status_code=exc.status)


# ------------------------------------------------------------------ models
class Msg(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[Msg] = Field(default_factory=list, max_length=40)


class InvestigateRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str = Field(max_length=200)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(max_length=200)


# ------------------------------------------------------------------ routes
@app.get("/health")
def health():
    try:
        e = get_engine()
        return {"status": "ok", "tests": len(e.tests), "evidence": len(e.evidence),
                "quality_report": e.quality is not None}
    except HTTPException as exc:
        return JSONResponse({"status": "no_data", "detail": exc.detail}, status_code=503)


def _experiments():
    if _state["experiments"] is None:
        _state["experiments"] = build_experiments(get_engine())
    return _state["experiments"]


@app.get("/experiments")
def experiments():
    return _experiments()[0]


@app.get("/meta")
def meta():
    return {"units": _experiments()[1]}


@app.post("/chat")
def chat(req: ChatRequest):
    history = [m.model_dump() for m in req.history]
    message = req.message.strip()
    if provider is not None:
        try:
            unified = provider.query(contextualise(message, history))
            try:
                legacy = get_engine()  # optional: adds NASA documentation links to the answer
            except HTTPException:
                legacy = None
            reply = build_chat_reply_v2(unified, message, legacy)
            reply["engine"] = provider.name
            return reply
        except AIUnavailable as exc:
            log.warning("AI engine failed, falling back to legacy engine: %s", exc)
    reply = build_chat_reply(get_engine(), message, history)
    reply["engine"] = "legacy"
    return reply


@app.get("/ai/status")
def ai_status():
    if provider is None:
        return {"mode": "legacy", "note": "Set FF_AI_URL (Colab server) or install requirements-ai.txt for the new model."}
    return provider.status()


@app.post("/ai/query")
def ai_query(req: InvestigateRequest):
    if provider is None:
        raise HTTPException(503, "The new AI model is not configured (running the legacy engine).")
    try:
        return provider.query(req.query.strip())
    except AIUnavailable as exc:
        raise HTTPException(502, str(exc))


@app.post("/investigate")
def investigate(req: InvestigateRequest):
    return clean(get_engine().investigate(req.query.strip(), req.top_k))


@app.post("/auth/signup")
def signup(req: SignupRequest):
    return auth_store.signup(req.name, req.email, req.password)


@app.post("/auth/login")
def login(req: LoginRequest):
    return auth_store.login(req.email, req.password)


@app.get("/auth/me")
def me(authorization: str = Header(default="")):
    return auth_store.verify(authorization.removeprefix("Bearer ").strip())
