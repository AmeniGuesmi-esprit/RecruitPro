package com.recruitment.subscription.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Plan d'abonnement défini par l'ADMIN.
 * - Pour type = COMPANY : quota = nombre d'offres d'emploi publiables pendant la durée de l'abonnement.
 * - Pour type = CANDIDATE : quota = nombre de candidatures possibles pendant la durée de l'abonnement.
 */
@Entity
@Table(name = "subscription_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionType type;

    /** Prix de l'abonnement */
    @Column(nullable = false)
    private Double montant;

    /** Nombre d'offres (COMPANY) ou nombre de candidatures (CANDIDATE) autorisées */
    @Column(nullable = false)
    private Integer quota;

    /** Durée de validité de l'abonnement, en jours */
    @Column(nullable = false)
    private Integer dureeJours;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Permet à l'admin de désactiver un plan sans le supprimer (ne sera plus proposé) */
    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
