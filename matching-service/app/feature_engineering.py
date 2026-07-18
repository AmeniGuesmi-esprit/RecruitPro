# -*- coding: utf-8 -*-
"""
Extraction de compétences / expérience depuis du texte brut (CV ou offre),
et construction des features numériques utilisées par le modèle de matching.

Ce module est partagé entre l'entraînement (training/train_model.py) et
l'inférence (app/model_service.py) : les features vues par le modèle à
l'entraînement doivent être calculées EXACTEMENT de la même façon en prod.
"""
import re
import unicodedata
from typing import Iterable

from app.skills_bank import ALL_SKILLS

_EXPERIENCE_PATTERNS = [
    r"(\d+(?:[.,]\d+)?)\s*(?:ans|années|year|years)\s*(?:d['’]?)?\s*(?:expérience|experience|exp)",
    r"expérience\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:ans|années)",
]


def _normalize(text: str) -> str:
    text = text or ""
    text = unicodedata.normalize("NFKD", text)
    return text.lower()


def extract_experience_years(text: str) -> float:
    """Cherche un motif du type '5 ans d'expérience' / '3 years experience'."""
    norm = _normalize(text)
    for pattern in _EXPERIENCE_PATTERNS:
        match = re.search(pattern, norm)
        if match:
            try:
                return float(match.group(1).replace(",", "."))
            except ValueError:
                continue
    return 0.0


def extract_skills(text: str, vocab: Iterable[str] = ALL_SKILLS) -> set:
    """
    Reconnaissance de compétences par correspondance de mots/expressions dans
    le texte (insensible à la casse, aux frontières de mots). Suffisant et
    robuste pour du texte de CV/offre en français ou anglais ; peut être
    remplacé plus tard par un NER plus avancé (spaCy) sans changer l'API.
    """
    norm = _normalize(text)
    found = set()
    for skill in vocab:
        skill_norm = _normalize(skill)
        # Compétences multi-mots ("Spring Boot") : simple recherche de sous-chaîne.
        # Compétences mono-mot : frontière de mot pour éviter les faux positifs
        # (ex: "R" ne doit pas matcher dans "Rigueur").
        if " " in skill_norm or "/" in skill_norm or "-" in skill_norm:
            if skill_norm in norm:
                found.add(skill)
        else:
            if re.search(r"(?<![a-z0-9])" + re.escape(skill_norm) + r"(?![a-z0-9])", norm):
                found.add(skill)
    return found


def skill_overlap_features(candidate_skills: set, job_skills: set) -> dict:
    job_skills = set(job_skills)
    candidate_skills = set(candidate_skills)
    union = candidate_skills | job_skills
    inter = candidate_skills & job_skills

    overlap_ratio = len(inter) / len(job_skills) if job_skills else 0.0
    jaccard = len(inter) / len(union) if union else 0.0

    return {
        "matched_skills": sorted(inter),
        "missing_skills": sorted(job_skills - candidate_skills),
        "extra_skills": sorted(candidate_skills - job_skills),
        "skill_overlap_ratio": overlap_ratio,
        "skill_jaccard": jaccard,
        "nb_matched_skills": len(inter),
        "nb_job_skills": len(job_skills),
    }


def build_features(cv_text: str, job_skills: list, job_description: str) -> dict:
    """
    Construit le dictionnaire de features utilisé par le modèle à partir du
    texte brut du CV et des infos de l'offre (compétences structurées +
    description texte).
    """
    cv_text = cv_text or ""
    job_description = job_description or ""
    job_skills_set = {s.strip() for s in job_skills if s and s.strip()}

    extracted_cv_skills = extract_skills(cv_text)
    overlap = skill_overlap_features(extracted_cv_skills, job_skills_set)

    cv_years = extract_experience_years(cv_text)
    job_years_required = extract_experience_years(job_description)
    experience_ratio = 0.0
    if job_years_required > 0:
        experience_ratio = min(cv_years / job_years_required, 1.5)
    elif cv_years > 0:
        experience_ratio = 1.0  # pas d'exigence explicite -> pas pénalisant

    combined_text = f"{cv_text} \n {job_description} \n {' '.join(sorted(job_skills_set))}"

    return {
        "extracted_cv_skills": sorted(extracted_cv_skills),
        "cv_years_experience": cv_years,
        "job_years_required": job_years_required,
        "experience_ratio": experience_ratio,
        "combined_text": combined_text,
        "cv_text": cv_text,
        **overlap,
    }
