import logging
import os
from functools import lru_cache

from fastapi import FastAPI
from pydantic import BaseModel

logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="SafeSpace AI Moderation Service",
    description="Scores text for toxicity/abuse using a DistilBERT-based classifier.",
    version="0.2.0",
)

TOXICITY_FLAG_THRESHOLD = float(os.getenv("TOXICITY_FLAG_THRESHOLD", "0.7"))
MODEL_NAME = "martin-ha/toxic-comment-model"

# A small set of severe terms used only when the HF model can't be loaded
# (e.g. no network access) — keeps the service usable in offline dev.
FALLBACK_KEYWORDS = {
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "cunt",
    "whore",
    "slut",
    "nigger",
    "faggot",
    "retard",
    "kill yourself",
}


@lru_cache(maxsize=1)
def get_classifier():
    try:
        from transformers import pipeline

        return pipeline("text-classification", model=MODEL_NAME, tokenizer=MODEL_NAME)
    except Exception as exc:  # noqa: BLE001 - any failure should fall back, not crash the service
        logger.warning("Could not load %s, falling back to heuristic scorer: %s", MODEL_NAME, exc)
        return None


def heuristic_score(text: str) -> float:
    lowered = text.lower()
    hits = sum(1 for term in FALLBACK_KEYWORDS if term in lowered)
    return min(1.0, hits * 0.5)


def score_with_model(classifier, text: str) -> float:
    result = classifier(text[:512])[0]
    label = result["label"].lower()
    # martin-ha/toxic-comment-model emits "toxic" / "non_toxic" — handle either ordering defensively.
    return result["score"] if "non" not in label else 1 - result["score"]


class ModerateRequest(BaseModel):
    text: str


class ModerateResponse(BaseModel):
    toxicity_score: float
    flagged: bool
    source: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/moderate", response_model=ModerateResponse)
def moderate(payload: ModerateRequest) -> ModerateResponse:
    classifier = get_classifier()
    if classifier is not None:
        score = score_with_model(classifier, payload.text)
        source = MODEL_NAME
    else:
        score = heuristic_score(payload.text)
        source = "heuristic-fallback"

    score = round(score, 4)
    return ModerateResponse(toxicity_score=score, flagged=score >= TOXICITY_FLAG_THRESHOLD, source=source)
