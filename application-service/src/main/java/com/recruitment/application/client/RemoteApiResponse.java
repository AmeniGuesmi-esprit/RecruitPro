package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/** Reproduit la forme {success, message, data} utilisée par tous les microservices. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RemoteApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
}
