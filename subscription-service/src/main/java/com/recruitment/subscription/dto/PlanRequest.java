package com.recruitment.subscription.dto;

import com.recruitment.subscription.model.SubscriptionType;
import lombok.Data;

@Data
public class PlanRequest {
    private String name;
    private SubscriptionType type;
    private Double montant;
    private Integer quota;
    private Integer dureeJours;
    private String description;
}
