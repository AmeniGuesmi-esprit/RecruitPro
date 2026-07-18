# matching-service

Microservice de **matching IA entre candidats et offres d'emploi**, pour la
plateforme de recrutement (api-gateway / user-service / job-service /
application-service / subscription-service).

Il expose une API REST (FastAPI) qui :
1. Récupère/parse le CV du candidat (PDF, téléchargé via l'URL fournie par
   `application-service`, généralement `.../api/users/files/{filename}`).
2. Extrait les compétences (via un dictionnaire de compétences multi-domaines)
   et l'expérience (en années) depuis le texte du CV.
3. Compare ces compétences/expérience aux compétences requises et à la
   description de l'offre (`Job.skills`, `Job.description`).
4. Renvoie un **score de matching de 0 à 100 %**, prédit par un modèle de
   Machine Learning (scikit-learn) entraîné sur un dataset synthétique de
   **10 000 lignes**, couvrant **10 types de CV différents**
   (Développement Logiciel, Data Science/IA, DevOps/Cloud, Cybersécurité,
   Design UI/UX, Marketing Digital, Finance/Comptabilité, Ressources
   Humaines, Réseaux/Systèmes, Gestion de Projet).

Le modèle est **déjà entraîné et fourni** dans `models/` (prêt à l'emploi).
Vous pouvez le ré-entraîner à tout moment (voir plus bas).

---

## 1. Démarrage rapide (sans Docker)

```bash
cd matching-service
python3 -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Vérifier que ça tourne :
```bash
curl http://localhost:8000/health
# {"status":"ok","modelReady":true}
```

Documentation interactive (Swagger) : http://localhost:8000/docs

## 2. Démarrage avec Docker

```bash
cd matching-service
docker build -t matching-service .
docker run -p 8000:8000 matching-service
```

## 3. Ré-entraîner le modèle (optionnel)

Le dataset et le modèle fournis sont déjà prêts, mais si vous voulez
régénérer un nouveau dataset ou changer les hyperparamètres :

```bash
# 1) Générer un nouveau dataset de 10 000 lignes (multi-domaines)
python training/generate_dataset.py --rows 10000 --out data/cv_job_matching_dataset.csv

# 2) Entraîner le modèle (TF-IDF + GradientBoostingRegressor)
python training/train_model.py --data data/cv_job_matching_dataset.csv
```

Cela régénère :
- `models/tfidf_vectorizer.joblib`
- `models/match_model.joblib`
- `models/metadata.json` (métriques : MAE ≈ 5 points, R² ≈ 0.90 sur le jeu de test)

Pour ajouter un **nouveau type de CV / domaine métier**, il suffit d'ajouter
une entrée dans `app/skills_bank.py` (`DOMAINS = {...}`), puis de relancer les
2 commandes ci-dessus. Aucune autre modification de code n'est nécessaire.

## 4. API

### `GET /health`
Vérifie que le modèle est chargé.

### `POST /api/match/score`
Score de matching pour **un** candidat / **une** offre.

Requête :
```json
{
  "jobSkills": ["Java", "Spring Boot", "Docker", "MySQL"],
  "jobDescription": "Poste de développeur backend, 3 ans d'expérience minimum.",
  "cvUrl": "http://user-service/api/users/files/abc123_cv.pdf"
}
```
(ou `"cvText": "..."` si le texte du CV est déjà disponible côté appelant)

Réponse :
```json
{
  "matchScore": 82.4,
  "matchedSkills": ["Java", "Spring Boot", "Docker"],
  "missingSkills": ["MySQL"],
  "extractedSkills": ["Java", "Spring Boot", "Docker", "Git", "Maven"],
  "extractedExperienceYears": 4.0
}
```

### `POST /api/match/batch`
Score de matching pour **plusieurs candidats** sur **une même offre** (utile
pour recalculer/afficher tous les scores de la liste des candidats d'un coup).

```json
{
  "jobSkills": ["Java", "Spring Boot"],
  "jobDescription": "...",
  "candidates": [
    { "candidateId": 12, "cvUrl": "http://user-service/api/users/files/x.pdf" },
    { "candidateId": 13, "cvUrl": "http://user-service/api/users/files/y.pdf" }
  ]
}
```

## 5. Intégration avec `application-service` (Java)

`application-service` appelle `POST /api/match/score` **au moment où le
candidat postule** (`ApplicationService.apply(...)`), stocke le score renvoyé
dans la nouvelle colonne `JobApplication.matchScore`, et l'expose dans
`ApplicationResponse.matchScore` consommé par le front (liste des candidats).

Voir le dossier `modifications-application-service/` fourni à côté de ce
microservice pour le détail des fichiers Java modifiés, et
`INTEGRATION.md` à la racine de la livraison pour les étapes d'installation
complètes (URL du service, variable `app.matching-service.url`, etc.).

Le service tourne indépendamment du reste des microservices Java (pas besoin
d'Eureka) : `application-service` l'appelle simplement sur une URL fixe
configurable (`app.matching-service.url`, ex: `http://localhost:8000` en
local ou `http://matching-service:8000` sous Docker Compose).

## 6. Structure du projet

```
matching-service/
├── app/
│   ├── main.py                 # API FastAPI (endpoints)
│   ├── model_service.py        # Chargement modèle + prédiction
│   ├── feature_engineering.py  # Extraction compétences/expérience + features
│   ├── cv_parser.py            # Téléchargement + extraction texte PDF
│   ├── skills_bank.py          # Dictionnaire de compétences multi-domaines
│   └── schemas.py               # Schémas Pydantic (requêtes/réponses)
├── training/
│   ├── generate_dataset.py     # Génère le dataset synthétique (10 000 lignes)
│   └── train_model.py          # Entraîne et sauvegarde le modèle
├── data/
│   └── cv_job_matching_dataset.csv   # Dataset généré (10 000 lignes)
├── models/
│   ├── tfidf_vectorizer.joblib
│   ├── match_model.joblib
│   └── metadata.json
├── requirements.txt
├── Dockerfile
└── README.md
```
