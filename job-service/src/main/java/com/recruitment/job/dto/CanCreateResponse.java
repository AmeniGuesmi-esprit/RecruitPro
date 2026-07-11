package com.recruitment.job.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Renvoyé par GET /api/jobs/can-create : permet au frontend de vérifier l'abonnement
 * AVANT d'ouvrir le formulaire de création d'offre (plutôt que de laisser la company
 * remplir tout le formulaire pour échouer seulement au submit).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CanCreateResponse {
    private boolean canCreate;
    /** OK | NO_SUBSCRIPTION | QUOTA_EXCEEDED */
    private String reason;
    private Integer quota;
    private Long used;
}
