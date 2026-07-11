package com.recruitment.subscription.dto;

import com.recruitment.subscription.model.SubscriptionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PlanResponse {
    private Long id;
    private String name;
    private SubscriptionType type;
    private Double montant;
    private Integer quota;
    private Integer dureeJours;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
