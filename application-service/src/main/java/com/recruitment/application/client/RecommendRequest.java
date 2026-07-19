package com.recruitment.application.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Corps de la requête envoyée à recommendation-service (POST /api/recommend/jobs). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendRequest {
    /** URL publique du CV (PDF) du candidat, ex: http://user-service/api/users/files/xxx.pdf */
    private String cvUrl;
    private List<RecommendJobItem> jobs;
    @Builder.Default
    private Integer topK = 10;
}
