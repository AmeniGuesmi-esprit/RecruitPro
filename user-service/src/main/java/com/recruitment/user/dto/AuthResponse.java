package com.recruitment.user.dto;

import com.recruitment.user.model.Role;
import lombok.*;

@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class AuthResponse {
    private String token;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private Long userId;
    private String imagePath;
}