package com.recruitment.application.client;

import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class UserClient {

    private final RestTemplate restTemplate;

    /** Récupère les infos d'un utilisateur (nom, cv) depuis user-service. Null si introuvable. */
    public UserInfo getUser(Long userId) {
        try {
            ResponseEntity<RemoteApiResponse<UserInfo>> resp = restTemplate.exchange(
                    "http://user-service/api/users/" + userId,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<RemoteApiResponse<UserInfo>>() {}
            );
            RemoteApiResponse<UserInfo> body = resp.getBody();
            return body != null ? body.getData() : null;
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }
}
