package com.recruitment.application.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Corps de la requête envoyée à matching-service (POST /api/match/score). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchScoreRequest {
    private List<String> jobSkills;
    private String jobDescription;
    /** URL publique du CV (PDF) du candidat, ex: http://user-service/api/users/files/xxx.pdf */
    private String cvUrl;
}
