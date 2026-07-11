package com.recruitment.application.client;

import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class SubscriptionClient {

    private final RestTemplate restTemplate;

    /**
     * Récupère l'abonnement ACTIF du candidat depuis subscription-service.
     * Retourne null si l'utilisateur n'a aucun abonnement actif OU si subscription-service
     * est injoignable (fail-closed : pas d'abonnement vérifiable = pas de candidature).
     */
    public SubscriptionInfo getActiveSubscription(Long candidateId) {
        try {
            ResponseEntity<RemoteApiResponse<SubscriptionInfo>> resp = restTemplate.exchange(
                    "http://subscription-service/api/subscriptions/internal/active/" + candidateId,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<RemoteApiResponse<SubscriptionInfo>>() {}
            );
            RemoteApiResponse<SubscriptionInfo> body = resp.getBody();
            return body != null ? body.getData() : null;
        } catch (RestClientException e) {
            return null;
        }
    }
}
