# -*- coding: utf-8 -*-
"""
Banque de compétences multi-domaines.

Utilisée à deux endroits :
  1. training/generate_dataset.py -> pour générer des CV et des offres synthétiques
     réalistes sur PLUSIEURS types de CV (dev, data, cybersécurité, design, etc.)
  2. app/feature_engineering.py -> pour extraire les compétences d'un texte de CV
     (le même vocabulaire sert de "dictionnaire" de reconnaissance).

Ajouter un domaine = ajouter une entrée ici, rien d'autre à changer.
"""

DOMAINS = {
    "Développement Logiciel": [
        "Java", "Spring Boot", "Spring", "Python", "JavaScript", "TypeScript",
        "Angular", "React", "Vue.js", "Node.js", "Express", "REST API",
        "GraphQL", "Microservices", "Docker", "Kubernetes", "Git", "CI/CD",
        "MySQL", "PostgreSQL", "MongoDB", "Redis", "JUnit", "Maven", "Gradle",
        "HTML", "CSS", "SASS", "Design Patterns", "SOLID", "Kafka", "RabbitMQ",
    ],
    "Data Science / Intelligence Artificielle": [
        "Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
        "scikit-learn", "Pandas", "NumPy", "NLP", "Computer Vision", "SQL",
        "Big Data", "Spark", "Hadoop", "Data Visualization", "Power BI",
        "Tableau", "Statistiques", "R", "Keras", "MLOps", "Feature Engineering",
        "A/B Testing", "Airflow", "Data Warehousing", "ETL",
    ],
    "DevOps / Cloud": [
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
        "Jenkins", "GitLab CI", "CI/CD", "Linux", "Bash", "Monitoring",
        "Prometheus", "Grafana", "Nginx", "Load Balancing", "Helm",
        "Infrastructure as Code", "Cloud Security", "Networking", "Vagrant",
    ],
    "Cybersécurité": [
        "Pentest", "SOC", "SIEM", "ISO 27001", "Firewall", "Cryptographie",
        "Analyse de vulnérabilités", "OWASP", "Forensics", "Gestion des risques",
        "IAM", "VPN", "Sécurité réseau", "Ethical Hacking", "Audit de sécurité",
        "Kali Linux", "Wireshark", "SOC monitoring", "Incident Response",
    ],
    "Design UI/UX": [
        "Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator",
        "Prototypage", "Wireframing", "Design System", "User Research",
        "Tests utilisateurs", "Accessibilité", "UI Design", "UX Writing",
        "Design Thinking", "InVision", "Motion Design", "After Effects",
    ],
    "Marketing Digital": [
        "SEO", "SEA", "Google Ads", "Google Analytics", "Réseaux sociaux",
        "Content Marketing", "Email Marketing", "Copywriting", "CRM",
        "Marketing Automation", "HubSpot", "Growth Hacking", "Branding",
        "Community Management", "Stratégie digitale", "Facebook Ads",
    ],
    "Finance / Comptabilité": [
        "Comptabilité générale", "Analyse financière", "Contrôle de gestion",
        "Excel avancé", "SAP", "Fiscalité", "Budgétisation", "IFRS",
        "Audit financier", "Trésorerie", "Reporting financier", "Consolidation",
        "Power BI", "Modélisation financière", "Gestion des risques financiers",
    ],
    "Ressources Humaines": [
        "Recrutement", "Gestion des talents", "Paie", "SIRH", "Droit du travail",
        "Formation professionnelle", "GPEC", "Onboarding", "Entretien annuel",
        "Marque employeur", "Relations sociales", "SuccessFactors", "Workday",
    ],
    "Réseaux / Systèmes": [
        "Windows Server", "Linux", "Active Directory", "TCP/IP", "VMware",
        "Virtualisation", "DNS", "DHCP", "VPN", "Supervision réseau",
        "Cisco", "Routage", "Switching", "Sécurité réseau", "PowerShell",
    ],
    "Gestion de Projet": [
        "Scrum", "Agile", "Kanban", "PMP", "Jira", "Confluence",
        "Gestion des risques", "Planification", "MS Project", "Budget projet",
        "Product Owner", "Roadmap produit", "Reporting projet", "PRINCE2",
    ],
}

SOFT_SKILLS = [
    "esprit d'équipe", "communication", "autonomie", "rigueur", "adaptabilité",
    "gestion du stress", "leadership", "sens de l'organisation",
    "résolution de problèmes", "créativité", "esprit critique", "curiosité",
]

EDUCATION_LEVELS = [
    ("Bac+2 (BTS/DUT)", 2),
    ("Bac+3 (Licence)", 3),
    ("Bac+5 (Master / Ingénieur)", 5),
    ("Doctorat (PhD)", 8),
]

ALL_SKILLS = sorted({s for skills in DOMAINS.values() for s in skills})
