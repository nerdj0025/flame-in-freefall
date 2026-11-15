from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import ai, store
from .models import AssistantReply, ChatRequest

app = FastAPI(title="Flame in Freefall API")

# Allow the Vite dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/experiments")
def list_experiments() -> list[dict]:
    return store.all_experiments()


@app.get("/experiments/{exp_id}")
def get_experiment(exp_id: str) -> dict:
    exp = store.get_experiment(exp_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@app.post("/chat", response_model=AssistantReply, response_model_exclude_none=True)
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message is empty")
    try:
        return ai.answer(req.message.strip(), req.history)
    except Exception as err:  # the frontend shows a Retry button on any non-200
        raise HTTPException(status_code=500, detail=f"Assistant failed: {err}")