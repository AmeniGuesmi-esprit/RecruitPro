package com.recruitment.application.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Appelle le microservice Python "recommendation-service" (FastAPI +
 * scikit-learn) qui, à partir du CV d'un candidat et de la liste des offres
 * actives, renvoie les K offres les plus pertinentes triées par score de
 * pertinence décroissant.
 *
 * Comme MatchingClient, ce service n'est PAS enregistré dans Eureka (service
 * Python indépendant) : on l'appelle sur une URL fixe configurée via
 * app.recommendation-service.url, avec un RestTemplate SANS @LoadBalanced
 * (cf. RestTemplateConfig#plainRestTemplate).
 *
 * En cas d'indisponibilité du service (down, timeout, erreur réseau), on
 * renvoie null : la page Recommandations affichera alors un état "service
 * temporairement indisponible" côté frontend plutôt que de planter.
 */
@Component
@Slf4j
public class RecommendationClient {

    private final RestTemplate restTemplate;
    private final String recommendationServiceUrl;

    public RecommendationClient(@Qualifier("plainRestTemplate") RestTemplate restTemplate,
                                 @Value("${app.recommendation-service.url:http://localhost:8001}") String recommendationServiceUrl) {
        this.restTemplate = restTemplate;
        this.recommendationServiceUrl = recommendationServiceUrl;
    }

    /**
     * @param cvUrl URL publique du CV (PDF) du candidat
     * @param jobs  offres actives à noter
     * @param topK  nombre max d'offres recommandées à renvoyer
     * @return la réponse de recommendation-service (offres triées par score), ou null si indisponible
     */
    public RecommendResponse recommend(String cvUrl, List<RecommendJobItem> jobs, int topK) {
        if (cvUrl == null || cvUrl.isBlank() || jobs == null || jobs.isEmpty()) {
            return null;
        }
        try {
            RecommendRequest request = RecommendRequest.builder()
                    .cvUrl(cvUrl)
                    .jobs(jobs)
                    .topK(topK)
                    .build();

            return restTemplate.postForObject(
                    recommendationServiceUrl + "/api/recommend/jobs",
                    request,
                    RecommendResponse.class
            );
        } catch (Exception e) {
            log.warn("recommendation-service indisponible, recommandations non calculées : {}", e.getMessage());
            return null;
        }
    }
}
