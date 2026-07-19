package com.recruitment.application.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JobClient {

    private final RestTemplate restTemplate;

    /** Récupère les infos d'une offre (statut, recruteur) depuis job-service. Null si introuvable. */
    public JobInfo getJob(Long jobId) {
        try {
            ResponseEntity<RemoteApiResponse<JobInfo>> resp = restTemplate.exchange(
                    "http://job-service/api/jobs/" + jobId,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<RemoteApiResponse<JobInfo>>() {}
            );
            RemoteApiResponse<JobInfo> body = resp.getBody();
            return body != null ? body.getData() : null;
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    /**
     * Récupère toutes les offres actives (publiées) depuis job-service
     * (GET /api/jobs, endpoint public). Utilisé par RecommendationService
     * pour constituer la liste des offres à faire noter par
     * recommendation-service. Renvoie une liste vide en cas d'indisponibilité
     * de job-service plutôt que de faire échouer la page Recommandations.
     */
    public List<JobInfo> getAllPublishedJobs() {
        try {
            ResponseEntity<RemoteApiResponse<List<JobInfo>>> resp = restTemplate.exchange(
                    "http://job-service/api/jobs",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<RemoteApiResponse<List<JobInfo>>>() {}
            );
            RemoteApiResponse<List<JobInfo>> body = resp.getBody();
            return body != null && body.getData() != null ? body.getData() : List.of();
        } catch (Exception e) {
            log.warn("job-service indisponible, impossible de récupérer les offres actives : {}", e.getMessage());
            return List.of();
        }
    }
}