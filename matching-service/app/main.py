# -*- coding: utf-8 -*-
"""
matching-service — microservice de matching CV <-> offre d'emploi.

Endpoints :
  GET  /health
  POST /api/match/score   -> score pour UN candidat / UNE offre
  POST /api/match/batch   -> scores pour PLUSIEURS candidats / UNE offre

Appelé par application-service (Java) au moment où un candidat postule,
et/ou pour ré-afficher/recalculer les scores dans la liste des candidats.
"""
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.cv_parser import fetch_text_from_pdf_url
from app.model_service import get_model
from app.schemas import (
    BatchMatchRequest,
    BatchMatchResponse,
    BatchMatchResultItem,
    MatchRequest,
    MatchResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("matching-service")

app = FastAPI(
    title="Matching Service",
    description="Matching IA entre CV des candidats et offres d'emploi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _load_model_on_startup():
    # Charge le modèle une fois au démarrage (échoue vite et clairement si le
    # modèle n'a pas été entraîné, plutôt que de planter sur la 1ère requête).
    get_model()


@app.get("/health")
def health():
    model = get_model()
    return {"status": "ok", "modelReady": model.is_ready()}


def _resolve_cv_text(cv_text, cv_url) -> str:
    if cv_text and cv_text.strip():
        return cv_text
    if cv_url:
        return fetch_text_from_pdf_url(cv_url)
    return ""


@app.post("/api/match/score", response_model=MatchResponse)
def match_score(payload: MatchRequest):
    if not payload.cvText and not payload.cvUrl:
        raise HTTPException(status_code=400, detail="cvText ou cvUrl requis")

    cv_text = _resolve_cv_text(payload.cvText, payload.cvUrl)
    model = get_model()
    result = model.predict(cv_text, payload.jobSkills, payload.jobDescription)
    return MatchResponse(**result)


@app.post("/api/match/batch", response_model=BatchMatchResponse)
def match_batch(payload: BatchMatchRequest):
    model = get_model()
    results = []
    for candidate in payload.candidates:
        cv_text = _resolve_cv_text(candidate.cvText, candidate.cvUrl)
        prediction = model.predict(cv_text, payload.jobSkills, payload.jobDescription)
        results.append(
            BatchMatchResultItem(
                candidateId=candidate.candidateId,
                matchScore=prediction["matchScore"],
                matchedSkills=prediction["matchedSkills"],
                missingSkills=prediction["missingSkills"],
            )
        )
    return BatchMatchResponse(results=results)
