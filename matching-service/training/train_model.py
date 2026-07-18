# -*- coding: utf-8 -*-
"""
Entraîne le modèle de matching CV <-> offre.

Pipeline :
  - TF-IDF sur le texte combiné (CV + description d'offre + compétences)
  - Features numériques : taux de recouvrement des compétences, Jaccard,
    ratio d'expérience
  - GradientBoostingRegressor -> prédit un score de matching 0-100

Sauvegarde :
  - models/tfidf_vectorizer.joblib
  - models/match_model.joblib
  - models/metadata.json (métriques + date d'entraînement)

Usage:
    python training/train_model.py --data data/cv_job_matching_dataset.csv
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import joblib  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy.sparse import hstack  # noqa: E402
from sklearn.ensemble import GradientBoostingRegressor  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.metrics import mean_absolute_error, r2_score  # noqa: E402
from sklearn.model_selection import train_test_split  # noqa: E402

from app.feature_engineering import build_features  # noqa: E402

NUMERIC_FEATURES = [
    "skill_overlap_ratio",
    "skill_jaccard",
    "nb_matched_skills",
    "nb_job_skills",
    "experience_ratio",
    "cv_years_experience",
    "job_years_required",
]


def build_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    records = []
    for _, row in df.iterrows():
        job_skills = str(row["job_skills"]).split(";") if row["job_skills"] else []
        feats = build_features(row["cv_text"], job_skills, row["job_description"])
        feats["match_score"] = row["match_score"]
        records.append(feats)
    return pd.DataFrame(records)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="data/cv_job_matching_dataset.csv")
    parser.add_argument("--models-dir", type=str, default="models")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    data_path = root / args.data
    models_dir = root / args.models_dir
    models_dir.mkdir(parents=True, exist_ok=True)

    print(f"Chargement du dataset : {data_path}")
    df = pd.read_csv(data_path)
    print(f"{len(df)} lignes chargées.")

    print("Construction des features (extraction compétences/expérience)...")
    feat_df = build_training_frame(df)

    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        feat_df, feat_df["match_score"], test_size=0.15, random_state=42
    )

    print("Entraînement du TF-IDF...")
    tfidf = TfidfVectorizer(max_features=3000, ngram_range=(1, 2), min_df=2)
    X_train_tfidf = tfidf.fit_transform(X_train_raw["combined_text"])
    X_test_tfidf = tfidf.transform(X_test_raw["combined_text"])

    X_train_num = X_train_raw[NUMERIC_FEATURES].to_numpy()
    X_test_num = X_test_raw[NUMERIC_FEATURES].to_numpy()

    X_train = hstack([X_train_tfidf, X_train_num]).tocsr()
    X_test = hstack([X_test_tfidf, X_test_num]).tocsr()

    print("Entraînement du GradientBoostingRegressor...")
    model = GradientBoostingRegressor(
        n_estimators=250,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = np.clip(model.predict(X_test), 0, 100)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"MAE (test) = {mae:.2f} points | R2 (test) = {r2:.3f}")

    joblib.dump(tfidf, models_dir / "tfidf_vectorizer.joblib")
    joblib.dump(model, models_dir / "match_model.joblib")

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_rows": len(df),
        "mae_test": round(float(mae), 3),
        "r2_test": round(float(r2), 3),
        "numeric_features": NUMERIC_FEATURES,
        "model": "GradientBoostingRegressor",
    }
    with open(models_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"Modèle sauvegardé dans {models_dir}")
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
