package com.recruitment.job.client;

import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class ApplicationClient {

    private final RestTemplate restTemplate;

    /**
     * Vérifie si au moins une candidature existe pour cette offre, avant d'autoriser
     * sa suppression définitive (voir JobService#deleteJob).
     *
     * Appelle un endpoint interne (sans authentification utilisateur, comme
     * SubscriptionClient#getActiveSubscription) qui doit exister côté
     * application-service :
     *
     *   GET /api/applications/internal/count/{jobId}  → ApiResponse<Long>
     *
     * Fail-CLOSED : si application-service est injoignable, on considère qu'il PEUT
     * y avoir des candidatures et on bloque la suppression par sécurité (on ne
     * prend pas le risque de supprimer une offre avec des candidatures perdues).
     */
    public boolean hasApplications(Long jobId) {
        try {
            ResponseEntity<RemoteApiResponse<Long>> resp = restTemplate.exchange(
                    "http://application-service/api/applications/internal/count/" + jobId,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<RemoteApiResponse<Long>>() {}
            );
            RemoteApiResponse<Long> body = resp.getBody();
            Long count = body != null ? body.getData() : null;
            return count != null && count > 0;
        } catch (RestClientException e) {
            // Fail-closed : service injoignable → on bloque la suppression par précaution
            return true;
        }
    }
}
