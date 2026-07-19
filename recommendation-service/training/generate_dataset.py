# -*- coding: utf-8 -*-
"""
Génère un dataset synthétique de 1 000 lignes (candidat x offre) couvrant
plusieurs types de CV (développement, data/IA, devops, cybersécurité, design,
marketing, finance, RH, réseaux, gestion de projet), pour entraîner le modèle
de RECOMMANDATION d'offres à partir d'un CV.

Chaque ligne contient :
  - le texte "brut" d'un CV (tel qu'on l'obtiendrait après extraction d'un PDF)
  - la description texte d'une offre + ses compétences requises (structuré,
    comme dans job-service : Job.skills)
  - un score de pertinence "vérité terrain" (0-100) calculé à partir des
    VRAIES compétences/expérience du candidat (pas celles ré-extraites),
    pour simuler l'évaluation d'un recruteur humain sur "cette offre
    convient-elle à ce profil ?".

Usage:
    python training/generate_dataset.py --rows 1000 --out data/cv_job_recommendation_dataset.csv
"""
import argparse
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.skills_bank import DOMAINS, SOFT_SKILLS, EDUCATION_LEVELS  # noqa: E402
from app.feature_engineering import resume_text_similarity  # noqa: E402

random.seed(42)

FIRST_NAMES = [
    "Amine", "Yassine", "Sarra", "Mehdi", "Nour", "Wael", "Rania", "Karim",
    "Salma", "Ahmed", "Ines", "Firas", "Emna", "Slim", "Rim", "Bilel",
    "Marwa", "Anis", "Dorra", "Hamza", "Sami", "Farah", "Aziz", "Molka",
]

CV_INTRO_TEMPLATES = [
    "{name}, {edu}, {years} ans d'expérience dans le domaine {domain}.",
    "Profil {domain} avec {years} ans d'expérience. Diplôme : {edu}.",
    "{name} - {edu} - {years} années d'expérience professionnelle en {domain}.",
    "Candidat motivé, {years} ans d'expérience en {domain}, {edu}.",
]

CV_EXPERIENCE_TEMPLATES = [
    "A travaillé pendant {years} ans sur des projets liés à {domain}, "
    "en mettant en œuvre {skills}.",
    "Expérience professionnelle de {years} ans incluant l'utilisation de "
    "{skills} dans des projets {domain}.",
    "Compétences techniques maîtrisées : {skills}. Domaine principal : {domain}.",
]

CV_SOFT_TEMPLATE = "Qualités personnelles : {softs}."

JOB_INTRO_TEMPLATES = [
    "Nous recherchons un profil {domain} justifiant d'au moins {years} ans "
    "d'expérience.",
    "Poste ouvert dans le domaine {domain}, {years} ans d'expérience minimum "
    "requis.",
    "Offre d'emploi : spécialiste {domain}, expérience minimale de {years} ans.",
]

JOB_REQUIREMENTS_TEMPLATE = (
    "Compétences requises : {skills}. Le candidat idéal maîtrise ces "
    "technologies et outils dans un contexte {domain}."
)


def _pick_skills(pool, k):
    k = min(k, len(pool))
    return random.sample(pool, k)


def _build_cv_text(domain, candidate_skills, years, edu_label, name):
    intro = random.choice(CV_INTRO_TEMPLATES).format(
        name=name, edu=edu_label, years=years, domain=domain
    )
    exp = random.choice(CV_EXPERIENCE_TEMPLATES).format(
        years=years, domain=domain, skills=", ".join(candidate_skills)
    )
    softs = random.sample(SOFT_SKILLS, k=min(3, len(SOFT_SKILLS)))
    soft_txt = CV_SOFT_TEMPLATE.format(softs=", ".join(softs))
    return f"{intro} {exp} {soft_txt}"


def _build_job_text(domain, job_skills, years_required):
    intro = random.choice(JOB_INTRO_TEMPLATES).format(domain=domain, years=years_required)
    reqs = JOB_REQUIREMENTS_TEMPLATE.format(skills=", ".join(job_skills), domain=domain)
    return f"{intro} {reqs}"


def _true_relevance_score(true_candidate_skills, true_job_skills, cand_years, job_years,
                           domain_match, cv_text, job_text):
    """Score de pertinence 'vérité terrain' : à quel point cette offre convient
    à ce profil (utilisé pour classer les offres à recommander à un candidat,
    et non l'inverse comme dans matching-service).

    Pondération : 50% expérience, 40% compétences, 10% résumé (similarité
    texte CV <-> offre, qui capture aussi implicitement l'alignement de
    domaine)."""
    job_set = set(true_job_skills)
    cand_set = set(true_candidate_skills)
    overlap_ratio = len(cand_set & job_set) / len(job_set) if job_set else 0.0

    exp_ratio = min(cand_years / job_years, 1.5) if job_years > 0 else 1.0
    exp_score = min(exp_ratio, 1.0)

    resume_sim = resume_text_similarity(cv_text, job_text)
    if not domain_match:
        resume_sim = min(resume_sim, 0.35)

    score = 100 * (0.50 * exp_score + 0.40 * overlap_ratio + 0.10 * resume_sim)
    score += random.gauss(0, 4.5)  # bruit réaliste (subjectivité recruteur)
    return max(0.0, min(100.0, score))


def generate_row(row_id):
    domain = random.choice(list(DOMAINS.keys()))
    domain_pool = DOMAINS[domain]

    name = random.choice(FIRST_NAMES)
    edu_label, edu_years = random.choice(EDUCATION_LEVELS)
    cand_years = max(0, round(random.gauss(5, 3)))
    cand_years = min(cand_years, 20)

    # Le candidat maîtrise un sous-ensemble de son domaine (parfois avec 1-2
    # compétences "bonus" d'un autre domaine, comme dans la vraie vie).
    n_cand_skills = random.randint(4, min(12, len(domain_pool)))
    candidate_skills = _pick_skills(domain_pool, n_cand_skills)
    if random.random() < 0.15:
        other_domain = random.choice([d for d in DOMAINS if d != domain])
        candidate_skills += _pick_skills(DOMAINS[other_domain], 1)

    cv_text = _build_cv_text(domain, candidate_skills, cand_years, edu_label, name)

    # L'offre : la plupart du temps même domaine (cas réaliste), parfois un
    # domaine différent (négatif clair), pour que le modèle apprenne aussi à
    # NE PAS recommander les offres hors du domaine du candidat.
    domain_match = random.random() < 0.75
    job_domain = domain if domain_match else random.choice([d for d in DOMAINS if d != domain])
    job_pool = DOMAINS[job_domain]
    n_job_skills = random.randint(4, min(10, len(job_pool)))
    job_skills = _pick_skills(job_pool, n_job_skills)
    job_years_required = random.choice([0, 1, 2, 3, 5, 7])

    job_text = _build_job_text(job_domain, job_skills, job_years_required)

    score = _true_relevance_score(
        candidate_skills, job_skills, cand_years, job_years_required,
        domain_match, cv_text, job_text,
    )

    return {
        "candidate_domain": domain,
        "candidate_skills": ";".join(candidate_skills),
        "candidate_years_experience": cand_years,
        "candidate_education": edu_label,
        "cv_text": cv_text,
        "job_domain": job_domain,
        "job_skills": ";".join(job_skills),
        "job_years_required": job_years_required,
        "job_description": job_text,
        "relevance_score": round(score, 2),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=int, default=1000)
    parser.add_argument("--out", type=str, default="data/cv_job_recommendation_dataset.csv")
    args = parser.parse_args()

    import pandas as pd

    rows = [generate_row(i) for i in range(args.rows)]
    df = pd.DataFrame(rows)

    out_path = Path(__file__).resolve().parent.parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False, encoding="utf-8")
    print(f"Dataset généré : {out_path} ({len(df)} lignes)")
    print(df["candidate_domain"].value_counts())


if __name__ == "__main__":
    main()
