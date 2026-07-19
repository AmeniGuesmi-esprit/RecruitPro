package com.recruitment.application.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Une offre recommandée pour le candidat connecté : détail de l'offre
 * (repris de job-service) + score de pertinence IA calculé par
 * recommendation-service, prêt à être affiché sur la page "Recommandations"
 * du frontend (mêmes champs que Job.model.ts côté Angular + le score).
 */
@Data
@Builder
public class JobRecommendationResponse {
    private Long jobId;
    private String title;
    private String description;
    private List<String> skills;
    private Double salary;
    private String workSchedule;
    private String companyName;
    private String logoUrl;
    private String contactEmail;
    private String contactPhone;
    private LocalDateTime dateCloture;
    private LocalDateTime dateEntretien;

    /** Score de pertinence IA (0-100) de cette offre pour le CV du candidat connecté. */
    private Double matchScore;
    /** Compétences du candidat retrouvées dans les compétences requises par l'offre. */
    private List<String> matchedSkills;
    /** Compétences requises par l'offre que le candidat ne possède pas (d'après son CV). */
    private List<String> missingSkills;
}
