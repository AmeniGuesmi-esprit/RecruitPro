package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/** Un élément de la liste "recommendations" renvoyée par recommendation-service. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecommendationScoreItem {
    private Long jobId;
    private Double score;
    private List<String> matchedSkills;
    private List<String> missingSkills;
}
