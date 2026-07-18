package com.recruitment.application.dto;

import com.recruitment.application.model.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ApplicationResponse {
    private Long id;
    private Long jobId;
    private Long candidateId;
    private String candidateFirstName;
    private String candidateLastName;
    private String candidateEmail;
    /** URL complète et prête à l'emploi vers le CV (via user-service/api/users/files) */
    private String cvUrl;
    /**
     * Pourcentage de correspondance (0-100) entre le CV du candidat et l'offre,
     * calculé par le microservice IA de matching. Null si non disponible
     * (candidat sans CV, ou service de matching indisponible au moment de la
     * candidature).
     */
    private Double matchScore;
    /** Statut de la candidature : EN_COURS_DE_TRAITEMENT (par défaut), ACCEPTEE_POUR_ENTRETIEN, REFUSEE */
    private ApplicationStatus status;
    private LocalDateTime appliedAt;
}