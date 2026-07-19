# recommendation-service

Microservice de **recommandation IA d'offres d'emploi** à partir du CV d'un
candidat, pour la plateforme de recrutement (api-gateway / user-service /
job-service / application-service / subscription-service / matching-service).

Contrairement à `matching-service` (qui répond à *"quel est le score de CE
candidat sur CETTE offre ?"*, déclenché à la candidature), `recommendation-service`
répond à *"quelles sont, parmi TOUTES les offres actives, les K plus
pertinentes pour LE CV de ce candidat ?"* — utilisé par la page **Recommandations**
du candidat, sans qu'il ait besoin de postuler.

Il expose une API REST (FastAPI) qui :
1. Récupère/parse le CV du candidat (PDF, téléchargé via l'URL fournie par
   `application-service`, généralement `.../api/users/files/{filename}`).
2. Extrait les compétences (dictionnaire multi-domaines) et l'expérience
   (années) depuis le texte du CV.
3. Compare ces compétences/expérience à **chacune des offres** reçues dans la
   requête (`jobSkills`, `jobDescription` fournis par `application-service`,
   eux-mêmes récupérés depuis `job-service`).
4. Renvoie les **K offres les plus pertinentes**, triées par score de
   pertinence décroissant (0-100), prédit par un modèle de Machine Learning
   (scikit-learn) entraîné sur un dataset synthétique de **1 000 lignes**,
   couvrant **10 types de CV différents** (Développement Logiciel, Data
   Science/IA, DevOps/Cloud, Cybersécurité, Design UI/UX, Marketing Digital,
   Finance/Comptabilité, Ressources Humaines, Réseaux/Systèmes, Gestion de
   Projet).

Le modèle est **déjà entraîné et fourni** dans `models/` (prêt à l'emploi).
Vous pouvez le ré-entraîner à tout moment (voir plus bas).

---

## 1. Démarrage rapide (sans Docker)

```bash
cd recommendation-service
python3 -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Vérifier que ça tourne :
```bash
curl http://localhost:8001/health
# {"status":"ok","modelReady":true}
```

Documentation interactive (Swagger) : http://localhost:8001/docs

## 2. Démarrage avec Docker

```bash
cd recommendation-service
docker build -t recommendation-service .
docker run -p 8001:8001 recommendation-service
```

Avec Docker Compose, ajouter par exemple :
```yaml
  recommendation-service:
    build: ./recommendation-service
    ports:
      - "8001:8001"
```

## 3. Ré-entraîner le modèle (optionnel)

Le dataset et le modèle fournis sont déjà prêts, mais si vous voulez régénérer
un nouveau dataset ou changer les hyperparamètres :

```bash
# 1) Générer un nouveau dataset de 1000 lignes (multi-domaines)
python training/generate_dataset.py --rows 1000 --out data/cv_job_recommendation_dataset.csv

# 2) Entraîner le modèle (TF-IDF + GradientBoostingRegressor)
python training/train_model.py --data data/cv_job_recommendation_dataset.csv
```

Cela régénère :
- `models/tfidf_vectorizer.joblib`
- `models/recommend_model.joblib`
- `models/metadata.json` (métriques : MAE ≈ 5.8 points, R² ≈ 0.87 sur le jeu
  de test, cf. dernier entraînement fourni)

Pour ajouter un **nouveau type de CV / domaine métier**, il suffit d'ajouter
une entrée dans `app/skills_bank.py` (`DOMAINS = {...}`), puis de relancer les
2 commandes ci-dessus. Aucune autre modification de code n'est nécessaire.

## 4. API

### `GET /health`
Vérifie que le modèle est chargé.

```json
{ "status": "ok", "modelReady": true }
```

### `POST /api/recommend/jobs`

Requête :
```json
{
  "cvText": null,
  "cvUrl": "http://localhost:8222/api/users/files/cv_amine.pdf",
  "jobs": [
    { "jobId": 12, "jobSkills": ["Java", "Spring Boot", "Docker"], "jobDescription": "Poste développeur backend Java, 5 ans minimum." },
    { "jobId": 27, "jobSkills": ["Figma", "UI Design"], "jobDescription": "Poste designer UI/UX." }
  ],
  "topK": 10
}
```

- `cvText` OU `cvUrl` doit être fourni (l'un des deux, `cvText` prioritaire s'il
  est déjà extrait côté appelant).
- `jobs` : liste des offres actives à noter (fournie par `application-service`,
  récupérée depuis `job-service`).
- `topK` : nombre max d'offres recommandées à renvoyer (défaut 10).

Réponse :
```json
{
  "extractedSkills": ["Docker", "Git", "Java", "Spring Boot"],
  "extractedExperienceYears": 6.0,
  "recommendations": [
    { "jobId": 12, "score": 97.1, "matchedSkills": ["Docker", "Java", "Spring Boot"], "missingSkills": [] },
    { "jobId": 27, "score": 22.4, "matchedSkills": [], "missingSkills": ["Figma", "UI Design"] }
  ]
}
```
`recommendations` est déjà **trié par score décroissant** et **limité à `topK`**.

## 5. Intégration dans la plateforme

Appelé par `application-service` (Java), qui :
1. Récupère le `cvPath` du candidat via `user-service` (`UserClient`).
2. Récupère la liste des offres publiées via `job-service` (`JobClient`).
3. Appelle `POST /api/recommend/jobs` avec le CV + la liste des offres.
4. Combine le score renvoyé avec le détail de chaque offre et renvoie le tout
   au frontend Angular (page **Recommandations**).

Voir `RecommendationClient.java` / `RecommendationController.java` côté
`application-service`.
