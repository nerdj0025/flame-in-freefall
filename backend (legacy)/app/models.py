from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = []


class Source(BaseModel):
    id: int  # must match the [n] markers inside the answer
    title: str
    snippet: str
    url: Optional[str] = None  # external page
    experimentId: Optional[str] = None  # links to /dashboard?exp=<id>


class AssistantReply(BaseModel):
    answer: str
    sources: list[Source] = []
    followUps: Optional[list[str]] = None