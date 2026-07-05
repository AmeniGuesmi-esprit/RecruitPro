package com.recruitment.application.model;

/**
 * Statut d'une candidature (JobApplication).
 * Par défaut, une candidature est créée avec le statut EN_COURS_DE_TRAITEMENT.
 * Seul le recruteur (COMPANY) propriétaire de l'offre peut ensuite la faire
 * passer à REFUSEE ou ACCEPTEE_POUR_ENTRETIEN.
 */
public enum ApplicationStatus {
    EN_COURS_DE_TRAITEMENT,
    ACCEPTEE_POUR_ENTRETIEN,
    REFUSEE
}
