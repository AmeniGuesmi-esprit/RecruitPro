package com.recruitment.user.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String phone;

    private String password;

    // Only for CANDIDATE
    private String cvPath;

    // Profile image (PNG, JPG, JFIF) — optional for all roles
    private String imagePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Builder.Default private boolean emailVerified = false;
    private String verificationToken;
    @Builder.Default private boolean googleAuth = false;
    @Builder.Default private boolean enabled = true;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    // ── Password reset ──────────────────────────────────────────────────────────
    private String passwordResetToken;
    private LocalDateTime passwordResetTokenExpiry;
}