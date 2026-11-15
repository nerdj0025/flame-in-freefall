"""
=====================================================================
  THE AI INTEGRATION POINT  (this is the file your AI teammate edits)
=====================================================================

The API calls answer(message, history) and expects an AssistantReply back:

    AssistantReply(
        answer="Without buoyancy the flame becomes a sphere [1]. It burns cooler [2].",
        sources=[
            Source(id=1, title="...", snippet="...", experimentId="FLEX-03"),
            Source(id=2, title="...", snippet="...", url="https://..."),
        ],
        followUps=["Why does it burn cooler?"],   # optional
    )

Rules
  - Every [n] marker in the answer must have a Source with id == n.
  - Use experimentId for NASA experiments from the database (the frontend
    links them to the dashboard) or url for external pages.
  - Raise an exception on failure: the frontend shows a Retry button.

Right now answer() is a tiny keyword search over the experiments so the app
works without any AI. Replace the body with your RAG / LLM pipeline.
"""
import re

from . import store
from .models import AssistantReply, ChatMessage, Source

STOP = {
    "the", "a", "an", "is", "are", "was", "were", "of", "in", "on", "at", "to", "and", "or",
    "why", "what", "how", "does", "do", "did", "it", "its", "this", "that", "with", "for",
    "me", "about", "tell", "show", "can", "you", "which", "when", "than", "more", "most",
}

# words people type -> words that appear in the data
SYNONYMS = {
    "freefall": "microgravity",
    "weightless": "microgravity",
    "space": "microgravity",
    "moon": "lunar",
    "round": "spherical",
    "sphere": "spherical",
    "droplet": "spherical",
    "cool": "blue",
    "paper": "cellulose",
    "plastic": "pmma",
    "candle": "paraffin",
    "wax": "paraffin",
    "cloth": "cotton",
    "fabric": "cotton",
    "alcohol": "ethanol",
    "heptane": "n-heptane",
}

FOLLOW_UPS = [
    "Why is a flame round in microgravity?",
    "How does oxygen change flame spread?",
    "Which experiments went out early?",
]


def _words(text: str) -> set[str]:
    raw = set(re.findall(r"[a-z0-9\-]+", text.lower())) - STOP
    return raw | {SYNONYMS[w] for w in raw if w in SYNONYMS}


def _score(exp: dict, words: set[str]) -> int:
    hay = " ".join(str(exp.get(k, "")) for k in ("id", "title", "fuel", "gravityLevel", "flameType")).lower()
    score = sum(1 for w in words if w in hay)
    if "extinguished" in words or "quench" in words or "out" in words:
        score += 2 if exp.get("extinguished") else 0
    return score


def _describe(e: dict) -> str:
    text = f"{e['id']} ({e.get('fuel', 'unknown fuel')}, {e.get('gravityLevel', 'unknown')} gravity)"
    text += f" burned with a {e['flameType']} flame" if e.get("flameType") else " was recorded"
    extra = []
    if "spreadRate" in e:
        extra.append(f"spread at {e['spreadRate']} mm/s")
    if "peakTemperature" in e:
        extra.append("peaked at " + str(e["peakTemperature"]) + " \u00b0C")
    if extra:
        text += " that " + " and ".join(extra)
    if e.get("extinguished"):
        text += ", and it went out before the run ended"
    return text + "."


def answer(message: str, history: list[ChatMessage]) -> AssistantReply:
    # ---- PLACEHOLDER: replace everything below with the real AI ----
    experiments = store.all_experiments()
    words = _words(message)
    ranked = sorted(experiments, key=lambda e: (-_score(e, words), e["id"]))
    hits = [e for e in ranked if _score(e, words) > 0][:3]

    if not hits:
        fuels = sorted({e["fuel"] for e in experiments})
        gravities = sorted({e["gravityLevel"] for e in experiments})
        return AssistantReply(
            answer=(
                "I could not find an experiment matching that. "
                f"The database covers fuels such as {', '.join(fuels[:5])} "
                f"and gravity levels: {', '.join(gravities)}. Try asking about one of them."
            ),
            sources=[],
            followUps=FOLLOW_UPS,
        )

    sentences = [_describe(e) + f" [{i}]" for i, e in enumerate(hits, start=1)]
    answer_text = "Here is what the experiments show. " + " ".join(sentences)
    sources = [
        Source(id=i, title=e["title"], snippet=_describe(e), experimentId=e["id"])
        for i, e in enumerate(hits, start=1)
    ]
    return AssistantReply(answer=answer_text, sources=sources, followUps=FOLLOW_UPS)