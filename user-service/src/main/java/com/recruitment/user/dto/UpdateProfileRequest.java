package com.recruitment.user.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @NotBlank private String phone;
    private String password; // optional - only if changing
}
