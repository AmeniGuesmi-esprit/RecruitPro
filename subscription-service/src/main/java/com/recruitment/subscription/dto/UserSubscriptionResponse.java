package com.recruitment.subscription.dto;

import com.recruitment.subscription.model.SubscriptionStatus;
import com.recruitment.subscription.model.SubscriptionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserSubscriptionResponse {
    private Long id;
    private Long userId;
    private SubscriptionType type;
    private Long planId;
    private String planName;
    private Double montant;
    /** Nombre d'offres (COMPANY) ou de candidatures (CANDIDATE) autorisées pendant cette période */
    private Integer quota;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private SubscriptionStatus status;
}
