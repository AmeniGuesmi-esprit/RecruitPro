package com.recruitment.application.controller;

import com.recruitment.application.dto.ApiResponse;
import com.recruitment.application.dto.JobRecommendationResponse;
import com.recruitment.application.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * ── CANDIDATE : offres d'emploi recommandées à partir du CV ──────────────────
 * Alimente la page "Recommandations" du frontend Angular. Combine :
 *   - le CV du candidat connecté (user-service)
 *   - la liste des offres actives (job-service)
 *   - le score de pertinence IA (recommendation-service, Python/FastAPI)
 */
@RestController
@RequestMapping("/api/applications/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<List<JobRecommendationResponse>>> getRecommendations(
            @RequestParam(name = "limit", required = false, defaultValue = "10") int limit,
            Authentication auth) {
        Long candidateId = (Long) auth.getCredentials();
        List<JobRecommendationResponse> recommendations =
                recommendationService.getRecommendationsForCandidate(candidateId, limit);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(ApiResponse.ok("Offres recommandées", recommendations));
    }
}
