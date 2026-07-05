package com.recruitment.job.model;

/**
 * Statut de publication d'une offre d'emploi.
 * PUBLISHED : l'offre est visible publiquement.
 * ARCHIVED  : l'offre n'est plus visible publiquement
 *             (archivage manuel par le recruteur ou automatique
 *             une fois la date de clôture dépassée).
 */
public enum JobStatus {
    PUBLISHED,
    ARCHIVED
}
