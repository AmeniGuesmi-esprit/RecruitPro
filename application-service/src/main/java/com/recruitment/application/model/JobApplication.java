package com.recruitment.application.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Une candidature d'un CANDIDATE à une offre (Job) du job-service.
 * Les infos du candidat (nom, cv) sont recopiées ici au moment de la
 * candidature (snapshot), pour éviter un appel réseau supplémentaire à
 * chaque affichage de la liste des candidats côté recruteur.
 */
@Entity
@Table(name = "job_applications",
        uniqueConstraints = @UniqueConstraint(columnNames = {"job_id", "candidate_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    @Column(nullable = false)
    private String candidateFirstName;

    @Column(nullable = false)
    private String candidateLastName;

    @Column(nullable = false)
    private String candidateEmail;

    /** Nom de fichier (ou chemin) du CV, tel que renvoyé par user-service */
    private String candidateCvPath;

    /**
     * Score de matching CV <-> offre (0-100), calculé une seule fois au moment
     * de la candidature par le microservice IA "matching-service" (snapshot,
     * comme candidateCvPath/candidateFirstName/... ci-dessus). Null si le
     * calcul n'a pas pu être fait (candidat sans CV, ou service indisponible
     * au moment de la candidature).
     */
    @Column(name = "match_score")
    private Double matchScore;

    /** Statut de la candidature. "EN_COURS_DE_TRAITEMENT" par défaut à la création. */
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.EN_COURS_DE_TRAITEMENT;

    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    @PrePersist
    void prePersist() {
        appliedAt = LocalDateTime.now();
        if (status == null) {
            status = ApplicationStatus.EN_COURS_DE_TRAITEMENT;
        }
    }
}