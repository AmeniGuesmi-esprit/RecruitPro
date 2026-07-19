# -*- coding: utf-8 -*-
"""
Chargement du modèle entraîné et calcul du score de RECOMMANDATION pour un
CV donné face à une offre donnée.

Techniquement le même pipeline de features que matching-service (TF-IDF +
features numériques de recouvrement compétences/expérience), mais le modèle
est entraîné et servi séparément ici, car le cas d'usage est différent :
- matching-service : recruteur consulte le score d'UN candidat sur UNE offre
  (déclenché à la candidature).
- recommendation-service : on score TOUTES les offres actives pour LE CV d'UN
  candidat, et on retourne les K offres les plus pertinentes (page
  "Recommandations" du candidat), sans qu'il ait besoin de postuler.
"""
import logging
from pathlib import Path

import joblib
import numpy as np
from scipy.sparse import hstack

from app.feature_engineering import build_features

logger = logging.getLogger("recommendation-service")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

NUMERIC_FEATURES = [
    "skill_overlap_ratio",
    "skill_jaccard",
    "nb_matched_skills",
    "nb_job_skills",
    "experience_ratio",
    "cv_years_experience",
    "job_years_required",
    "resume_similarity",
]


class RecommendationModel:
    def __init__(self):
        self.tfidf = None
        self.model = None
        self._load()

    def _load(self):
        tfidf_path = MODELS_DIR / "tfidf_vectorizer.joblib"
        model_path = MODELS_DIR / "recommend_model.joblib"
        if not tfidf_path.exists() or not model_path.exists():
            raise FileNotFoundError(
                "Modèle introuvable. Lancez d'abord : "
                "python training/generate_dataset.py && python training/train_model.py"
            )
        self.tfidf = joblib.load(tfidf_path)
        self.model = joblib.load(model_path)
        logger.info("Modèle de recommandation chargé depuis %s", MODELS_DIR)

    def is_ready(self) -> bool:
        return self.tfidf is not None and self.model is not None

    def score_job(self, cv_text: str, job_skills: list, job_description: str) -> dict:
        """Calcule le score de pertinence (0-100) d'UNE offre pour le CV donné."""
        feats = build_features(cv_text, job_skills, job_description)

        tfidf_vec = self.tfidf.transform([feats["combined_text"]])
        num_vec = np.array([[feats[k] for k in NUMERIC_FEATURES]])
        X = hstack([tfidf_vec, num_vec]).tocsr()

        raw_score = float(self.model.predict(X)[0])
        score = max(0.0, min(100.0, raw_score))

        return {
            "score": round(score, 1),
            "matchedSkills": feats["matched_skills"],
            "missingSkills": feats["missing_skills"],
        }

    def extract_cv_profile(self, cv_text: str) -> dict:
        """Compétences/expérience extraites du CV seul (sans offre), pour l'affichage."""
        feats = build_features(cv_text, [], "")
        return {
            "extractedSkills": feats["extracted_cv_skills"],
            "extractedExperienceYears": feats["cv_years_experience"],
        }


_singleton: "RecommendationModel | None" = None


def get_model() -> RecommendationModel:
    global _singleton
    if _singleton is None:
        _singleton = RecommendationModel()
    return _singleton
