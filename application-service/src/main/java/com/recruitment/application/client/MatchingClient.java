package com.recruitment.application.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Appelle le microservice Python "matching-service" (FastAPI + scikit-learn)
 * qui calcule un pourcentage de correspondance entre le CV d'un candidat et
 * une offre d'emploi (compétences + expérience extraites du CV vs
 * compétences/description de l'offre).
 *
 * Ce service n'est PAS enregistré dans Eureka (service Python indépendant) :
 * on l'appelle sur une URL fixe configurée via app.matching-service.url, avec
 * un RestTemplate SANS @LoadBalanced (cf. RestTemplateConfig#plainRestTemplate) :
 * le RestTemplate @LoadBalanced par défaut interpréterait "localhost" comme un
 * nom de service Eureka à résoudre et échouerait systématiquement.
 *
 * En cas d'indisponibilité du service (down, timeout, erreur réseau), on
 * renvoie null plutôt que de faire échouer la candidature : le matching est
 * une fonctionnalité additionnelle, elle ne doit jamais bloquer un candidat
 * qui postule.
 */
@Component
@Slf4j
public class MatchingClient {

    private final RestTemplate restTemplate;
    private final String matchingServiceUrl;

    public MatchingClient(@Qualifier("plainRestTemplate") RestTemplate restTemplate,
                          @Value("${app.matching-service.url:http://localhost:8000}") String matchingServiceUrl) {
        this.restTemplate = restTemplate;
        this.matchingServiceUrl = matchingServiceUrl;
    }

    /**
     * @param jobSkills   compétences requises par l'offre (Job.skills)
     * @param jobDescription description texte de l'offre
     * @param cvUrl       URL publique du CV (PDF) du candidat, peut être null
     * @return le score de matching (0-100), ou null si le calcul est indisponible
     */
    public MatchScoreResponse computeMatchScore(List<String> jobSkills, String jobDescription, String cvUrl) {
        if (cvUrl == null || cvUrl.isBlank()) {
            // Pas de CV renseigné par le candidat : impossible de calculer un score.
            return null;
        }
        try {
            MatchScoreRequest request = MatchScoreRequest.builder()
                    .jobSkills(jobSkills)
                    .jobDescription(jobDescription)
                    .cvUrl(cvUrl)
                    .build();

            return restTemplate.postForObject(
                    matchingServiceUrl + "/api/match/score",
                    request,
                    MatchScoreResponse.class
            );
        } catch (Exception e) {
            // Le matching-service peut être temporairement indisponible : on ne
            // bloque jamais la candidature pour autant, on log et on continue.
            log.warn("matching-service indisponible, score de matching non calculé : {}", e.getMessage());
            return null;
        }
    }
}