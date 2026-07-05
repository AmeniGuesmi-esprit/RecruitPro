package com.recruitment.job.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @ElementCollection
    @CollectionTable(name = "job_skills", joinColumns = @JoinColumn(name = "job_id"))
    @Column(name = "skill")
    private List<String> skills;

    @Column(nullable = false)
    private Double salary;

    /** CDI, CDD, Temps partiel, Freelance, Stage … */
    @Column(nullable = false)
    private String workSchedule;

    /** Nom affiché de la société */
    @Column(nullable = false)
    private String companyName;

    /** Chemin relatif vers le logo stocké sur disque */
    private String logoPath;

    @Column(nullable = false)
    private String contactEmail;

    private String contactPhone;

    /** userId du recruteur (company) côté user-service */
    @Column(nullable = false)
    private Long recruiterId;

    /** Statut de publication : PUBLISHED (publiée), CLOTURE (date de clôture dépassée, auto) ou ARCHIVED (archivée manuellement) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobStatus status;

    /** Date de début de l'offre : fixée automatiquement à la date courante lors de la création */
    @Column(nullable = false, updatable = false)
    private LocalDateTime dateDebut;

    /** Date de clôture de l'offre : doit être postérieure à la date courante au moment de la création */
    @Column(nullable = false)
    private LocalDateTime dateCloture;

    /** Date de l'entretien : doit être postérieure à la date de clôture */
    @Column(nullable = false)
    private LocalDateTime dateEntretien;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = LocalDateTime.now();
        if (dateDebut == null) dateDebut = createdAt;
        if (status == null) status = JobStatus.PUBLISHED;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}