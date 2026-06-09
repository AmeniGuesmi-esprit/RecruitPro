package com.recruitment.user.dto;

import com.recruitment.user.model.Role;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class RegisterRequest {
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @Email @NotBlank private String email;
    @NotBlank private String phone;
    @Size(min = 8) private String password;
    @NotNull private Role role;
    // CV - only for CANDIDATE, handled separately as MultipartFile
}
