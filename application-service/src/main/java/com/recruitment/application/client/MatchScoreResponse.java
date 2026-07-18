package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/** Réponse renvoyée par matching-service (POST /api/match/score). */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MatchScoreResponse {
    private Double matchScore;
    private List<String> matchedSkills;
    private List<String> missingSkills;
    private List<String> extractedSkills;
    private Double extractedExperienceYears;
}
