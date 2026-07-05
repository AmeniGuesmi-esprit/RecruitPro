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
}
