# -*- coding: utf-8 -*-
from typing import List, Optional

from pydantic import BaseModel, Field


class JobItem(BaseModel):
    """Une offre candidate à noter, telle qu'envoyée par application-service
    (issue de job-service : Job.skills / Job.description)."""
    jobId: int
    jobSkills: List[str] = Field(default_factory=list)
    jobDescription: str = ""


class RecommendRequest(BaseModel):
    """Requête : le CV d'UN candidat + la liste des offres actives parmi
    lesquelles il faut recommander les plus pertinentes."""
    cvText: Optional[str] = Field(default=None, description="Texte du CV déjà extrait (optionnel)")
    cvUrl: Optional[str] = Field(default=None, description="URL du PDF du CV (téléchargé et parsé côté service)")
    jobs: List[JobItem] = Field(default_factory=list)
    topK: int = Field(default=10, ge=1, le=100, description="Nombre max d'offres recommandées à renvoyer")


class JobRecommendation(BaseModel):
    jobId: int
    score: float
    matchedSkills: List[str]
    missingSkills: List[str]


class RecommendResponse(BaseModel):
    extractedSkills: List[str]
    extractedExperienceYears: float
    recommendations: List[JobRecommendation]
