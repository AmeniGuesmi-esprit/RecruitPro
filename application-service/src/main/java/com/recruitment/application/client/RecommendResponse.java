package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/** Réponse renvoyée par recommendation-service (POST /api/recommend/jobs). */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecommendResponse {
    private List<String> extractedSkills;
    private Double extractedExperienceYears;
    private List<RecommendationScoreItem> recommendations;
}
