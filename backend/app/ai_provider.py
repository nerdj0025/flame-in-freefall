"""Where the answers come from. One small interface: provider.query(question) -> the unified JSON
returned by flameguard_unified_query() (keys: user_query, requested_experiments, retrieved_evidence,
scientific_analysis, safety_warnings)."""
from __future__ import annotations

import importlib.util
import logging
import os
import threading
from typing import Any

import httpx

from . import config
from .engine import clean

log = logging.getLogger("flame.ai")


class AIUnavailable(RuntimeError):
    pass


class RemoteProvider:
    """The friend's app.py running somewhere else (Colab + tunnel). Contract: POST /query {"question"}."""

    name = "remote"

    def __init__(self, url: str, timeout: float):
        self.url, self.timeout = url, timeout

    def query(self, question: str) -> dict[str, Any]:
        try:
            res = httpx.post(f"{self.url}/query", json={"question": question}, timeout=self.timeout)
            res.raise_for_status()
            return res.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise AIUnavailable(f"AI server at {self.url} failed: {exc}") from exc

    def status(self) -> dict[str, Any]:
        try:
            res = httpx.get(f"{self.url}/docs", timeout=8)
            return {"mode": "remote", "url": self.url, "reachable": res.status_code < 500}
        except httpx.HTTPError:
            return {"mode": "remote", "url": self.url, "reachable": False}


class LocalProvider:
    """Runs app/flameguard_engine.py in this process. Loads lazily (first question downloads the models)."""

    name = "local"

    def __init__(self, data_dir):
        self.data_dir = data_dir
        self._fg = None
        self._error: str | None = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._fg is not None:
                return self._fg
            if self._error:
                raise AIUnavailable(self._error)
            try:
                os.environ["FF_DATA_DIR"] = str(self.data_dir)  # the engine reads this when imported
                from . import flameguard_engine as fg

                self._fg = fg
                return fg
            except Exception as exc:  # missing data file, bad columns, ...
                self._error = f"{type(exc).__name__}: {exc}"
                log.error("local AI engine failed to load: %s", self._error)
                raise AIUnavailable(self._error) from exc

    def query(self, question: str) -> dict[str, Any]:
        fg = self._load()
        with self._lock:  # the models are not built for parallel first-use
            try:
                return clean(fg.flameguard_unified_query(question))
            except Exception as exc:
                raise AIUnavailable(f"{type(exc).__name__}: {exc}") from exc

    def status(self) -> dict[str, Any]:
        return {"mode": "local", "loaded": self._fg is not None, "error": self._error}


def _local_possible() -> bool:
    return importlib.util.find_spec("sentence_transformers") is not None


def make_provider():
    """None means: use the legacy engine."""
    mode = config.AI_MODE
    if mode == "legacy":
        return None
    if mode == "remote" or (mode == "auto" and config.AI_URL):
        if not config.AI_URL:
            log.warning("FF_AI_MODE=remote but FF_AI_URL is empty -> legacy engine")
            return None
        return RemoteProvider(config.AI_URL, config.AI_TIMEOUT)
    if mode == "local" or (mode == "auto" and _local_possible()):
        if not _local_possible():
            log.warning("FF_AI_MODE=local but sentence-transformers is not installed "
                        "(pip install -r requirements-ai.txt) -> legacy engine")
            return None
        return LocalProvider(config.DATA_DIR)
    return None
