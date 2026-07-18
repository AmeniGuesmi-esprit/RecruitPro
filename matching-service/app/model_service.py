# -*- coding: utf-8 -*-
"""
Chargement du modèle entraîné et calcul du score de matching pour un
couple (CV, offre) donné.
"""
import logging
from pathlib import Path

import joblib
import numpy as np
from scipy.sparse import hstack

from app.feature_engineering import build_features

logger = logging.getLogger("matching-service")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

NUMERIC_FEATURES = [
    "skill_overlap_ratio",
    "skill_jaccard",
    "nb_matched_skills",
    "nb_job_skills",
    "experience_ratio",
    "cv_years_experience",
    "job_years_required",
]


class MatchingModel:
    def __init__(self):
        self.tfidf = None
        self.model = None
        self._load()

    def _load(self):
        tfidf_path = MODELS_DIR / "tfidf_vectorizer.joblib"
        model_path = MODELS_DIR / "match_model.joblib"
        if not tfidf_path.exists() or not model_path.exists():
            raise FileNotFoundError(
                "Modèle introuvable. Lancez d'abord : "
                "python training/generate_dataset.py && python training/train_model.py"
            )
        self.tfidf = joblib.load(tfidf_path)
        self.model = joblib.load(model_path)
        logger.info("Modèle de matching chargé depuis %s", MODELS_DIR)

    def is_ready(self) -> bool:
        return self.tfidf is not None and self.model is not None

    def predict(self, cv_text: str, job_skills: list, job_description: str) -> dict:
        feats = build_features(cv_text, job_skills, job_description)

        tfidf_vec = self.tfidf.transform([feats["combined_text"]])
        num_vec = np.array([[feats[k] for k in NUMERIC_FEATURES]])
        X = hstack([tfidf_vec, num_vec]).tocsr()

        raw_score = float(self.model.predict(X)[0])
        score = max(0.0, min(100.0, raw_score))

        return {
            "matchScore": round(score, 1),
            "matchedSkills": feats["matched_skills"],
            "missingSkills": feats["missing_skills"],
            "extractedSkills": feats["extracted_cv_skills"],
            "extractedExperienceYears": feats["cv_years_experience"],
        }


_singleton: "MatchingModel | None" = None


def get_model() -> MatchingModel:
    global _singleton
    if _singleton is None:
        _singleton = MatchingModel()
    return _singleton
