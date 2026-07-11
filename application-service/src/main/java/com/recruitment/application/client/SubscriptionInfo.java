package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDateTime;

/** Sous-ensemble des champs de UserSubscriptionResponse (subscription-service) dont on a besoin ici. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubscriptionInfo {
    private Long id;
    private Long userId;
    private String type;      // COMPANY / CANDIDATE
    private Long planId;
    private String planName;
    private Double montant;
    /** Nombre de candidatures autorisées pendant la période en cours */
    private Integer quota;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String status;    // ACTIVE / EXPIRED
}
