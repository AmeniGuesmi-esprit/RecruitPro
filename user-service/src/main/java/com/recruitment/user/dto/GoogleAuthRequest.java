package com.recruitment.user.dto;

import com.recruitment.user.model.Role;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleAuthRequest {
    @NotBlank private String googleToken;
    private Role role; // required on first login
}
