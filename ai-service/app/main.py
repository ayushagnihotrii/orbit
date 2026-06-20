from fastapi import FastAPI

app = FastAPI(
    title="SafeSpace AI Moderation Service",
    description="Scores text for toxicity/abuse. Moderation model is wired up in Phase 4.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
