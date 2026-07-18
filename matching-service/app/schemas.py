# -*- coding: utf-8 -*-
from typing import List, Optional

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    jobSkills: List[str] = Field(default_factory=list, description="Compétences requises par l'offre (Job.skills)")
    jobDescription: str = Field(default="", description="Description texte de l'offre")
    cvText: Optional[str] = Field(default=None, description="Texte du CV déjà extrait (optionnel)")
    cvUrl: Optional[str] = Field(default=None, description="URL du PDF du CV (téléchargé et parsé côté service)")


class MatchResponse(BaseModel):
    matchScore: float
    matchedSkills: List[str]
    missingSkills: List[str]
    extractedSkills: List[str]
    extractedExperienceYears: float


class BatchCandidate(BaseModel):
    candidateId: int
    cvText: Optional[str] = None
    cvUrl: Optional[str] = None


class BatchMatchRequest(BaseModel):
    jobSkills: List[str] = Field(default_factory=list)
    jobDescription: str = ""
    candidates: List[BatchCandidate]


class BatchMatchResultItem(BaseModel):
    candidateId: int
    matchScore: float
    matchedSkills: List[str]
    missingSkills: List[str]


class BatchMatchResponse(BaseModel):
    results: List[BatchMatchResultItem]
