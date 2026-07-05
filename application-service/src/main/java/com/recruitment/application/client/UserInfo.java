package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/** Sous-ensemble des champs de User (user-service) dont on a besoin ici. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserInfo {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String cvPath;
}
