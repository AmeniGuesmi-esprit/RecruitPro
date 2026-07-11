package com.recruitment.subscription.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Souscription d'un utilisateur (company ou candidate) à un {@link SubscriptionPlan}.
 * Le quota consommé n'est PAS stocké ici : il est calculé à la volée par job-service
 * (nombre d'offres créées par recruiterId depuis dateDebut) et par application-service
 * (nombre de candidatures créées par candidateId depuis dateDebut). Cela permet à un
 * renouvellement de repartir sur un quota neuf automatiquement.
 */
@Entity
@Table(name = "user_subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** userId côté user-service */
    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionType type;

    @Column(nullable = false)
    private Long planId;

    /** Snapshot du plan au moment de la souscription (le plan admin peut changer ensuite) */
    @Column(nullable = false)
    private String planName;

    @Column(nullable = false)
    private Double montant;

    @Column(nullable = false)
    private Integer quota;

    @Column(nullable = false)
    private LocalDateTime dateDebut;

    @Column(nullable = false)
    private LocalDateTime dateFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        if (status == null) status = SubscriptionStatus.ACTIVE;
    }
}
