# -*- coding: utf-8 -*-
"""
recommendation-service — microservice de RECOMMANDATION d'offres d'emploi
à partir du CV d'un candidat.

Endpoints :
  GET  /health
  POST /api/recommend/jobs  -> reçoit le CV d'un candidat + la liste des
                                offres actives (fournie par application-service,
                                elle-même alimentée par job-service), et renvoie
                                les K offres les plus pertinentes, triées par
                                score décroissant.

Appelé par application-service (Java) pour alimenter la page "Recommandations"
du candidat (frontend Angular).
"""
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.cv_parser import fetch_text_from_pdf_url
from app.model_service import get_model
from app.schemas import JobRecommendation, RecommendRequest, RecommendResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation-service")

app = FastAPI(
    title="Recommendation Service",
    description="Recommandation IA d'offres d'emploi à partir du CV d'un candidat",
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


@app.post("/api/recommend/jobs", response_model=RecommendResponse)
def recommend_jobs(payload: RecommendRequest):
    if not payload.cvText and not payload.cvUrl:
        raise HTTPException(status_code=400, detail="cvText ou cvUrl requis")

    cv_text = _resolve_cv_text(payload.cvText, payload.cvUrl)
    if not cv_text.strip():
        raise HTTPException(status_code=422, detail="Impossible d'extraire le texte du CV")

    model = get_model()
    profile = model.extract_cv_profile(cv_text)

    scored = []
    for job in payload.jobs:
        result = model.score_job(cv_text, job.jobSkills, job.jobDescription)
        scored.append(
            JobRecommendation(
                jobId=job.jobId,
                score=result["score"],
                matchedSkills=result["matchedSkills"],
                missingSkills=result["missingSkills"],
            )
        )

    # Tri décroissant par score de pertinence, on ne garde que le top K
    scored.sort(key=lambda r: r.score, reverse=True)
    top = scored[: payload.topK]

    return RecommendResponse(
        extractedSkills=profile["extractedSkills"],
        extractedExperienceYears=profile["extractedExperienceYears"],
        recommendations=top,
    )
