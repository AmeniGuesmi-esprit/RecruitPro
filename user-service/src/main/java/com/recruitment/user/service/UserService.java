package com.recruitment.user.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.recruitment.user.dto.*;
import com.recruitment.user.model.*;
import com.recruitment.user.repository.UserRepository;
import com.recruitment.user.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final FileStorageService fileStorageService;

    @Value("${app.google.client-id}")
    private String googleClientId;


    @Transactional
    public ApiResponse<Void> register(RegisterRequest request,
                                      MultipartFile cvFile,
                                      MultipartFile imageFile) throws IOException {

        if (userRepository.existsByEmail(request.getEmail())) {
            return ApiResponse.error("Cet email est déjà utilisé");
        }

        String cvPath = null;
        if (request.getRole() == Role.CANDIDATE) {
            if (cvFile == null || cvFile.isEmpty()) {
                return ApiResponse.error("Le CV est obligatoire pour les candidats");
            }
            cvPath = fileStorageService.storeCv(cvFile);
        }

        // Profile image — optional for all roles
        String imagePath = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            imagePath = fileStorageService.storeImage(imageFile);
        }

        String verificationToken = UUID.randomUUID().toString();

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .cvPath(cvPath)
                .imagePath(imagePath)
                .verificationToken(verificationToken)
                .emailVerified(false)
                .build();

        userRepository.save(user);
        emailService.sendVerificationEmail(user.getEmail(), verificationToken);

        return ApiResponse.success("Inscription réussie. Veuillez vérifier votre email.", null);
    }

    @Transactional
    public ApiResponse<Void> verifyEmail(String token) {
        Optional<User> optUser = userRepository.findByVerificationToken(token);
        if (optUser.isEmpty()) {
            return ApiResponse.error("Token de vérification invalide");
        }
        User user = optUser.get();
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
        return ApiResponse.success("Email vérifié avec succès", null);
    }

    public ApiResponse<AuthResponse> login(LoginRequest request) {
        Optional<User> optUser = userRepository.findByEmail(request.getEmail());
        if (optUser.isEmpty()) {
            return ApiResponse.error("Email ou mot de passe incorrect");
        }

        User user = optUser.get();
        if (!user.isEmailVerified()) {
            return ApiResponse.error("Veuillez vérifier votre email avant de vous connecter");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ApiResponse.error("Email ou mot de passe incorrect");
        }

        String token = jwtService.generateToken(user);
        return ApiResponse.success("Connexion réussie", buildAuthResponse(user, token));
    }

    @Transactional
    public ApiResponse<AuthResponse> googleAuth(GoogleAuthRequest request) throws Exception {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken = verifier.verify(request.getGoogleToken());
        if (idToken == null) {
            return ApiResponse.error("Token Google invalide");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String firstName = (String) payload.get("given_name");
        String lastName  = (String) payload.get("family_name");

        Optional<User> optUser = userRepository.findByEmail(email);
        User user;

        if (optUser.isEmpty()) {
            if (request.getRole() == null) {
                return ApiResponse.error("Rôle requis pour le premier accès via Google");
            }
            user = User.builder()
                    .email(email)
                    .firstName(firstName != null ? firstName : "")
                    .lastName(lastName != null ? lastName : "")
                    .phone("")
                    .role(request.getRole())
                    .googleAuth(true)
                    .emailVerified(true)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .build();
            userRepository.save(user);
        } else {
            user = optUser.get();
        }

        String token = jwtService.generateToken(user);
        return ApiResponse.success("Connexion Google réussie", buildAuthResponse(user, token));
    }

    public ApiResponse<User> getProfile(Long userId) {
        return userRepository.findById(userId)
                .map(u -> ApiResponse.success("Profil récupéré", u))
                .orElse(ApiResponse.error("Utilisateur non trouvé"));
    }

    @Transactional
    public ApiResponse<User> updateProfile(Long userId,
                                           UpdateProfileRequest request,
                                           MultipartFile cvFile,
                                           MultipartFile imageFile) throws IOException {
        Optional<User> optUser = userRepository.findById(userId);
        if (optUser.isEmpty()) return ApiResponse.error("Utilisateur non trouvé");

        User user = optUser.get();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setUpdatedAt(LocalDateTime.now());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (user.getRole() == Role.CANDIDATE && cvFile != null && !cvFile.isEmpty()) {
            fileStorageService.deleteFile(user.getCvPath());
            user.setCvPath(fileStorageService.storeCv(cvFile));
        }

        if (imageFile != null && !imageFile.isEmpty()) {
            fileStorageService.deleteFile(user.getImagePath());
            user.setImagePath(fileStorageService.storeImage(imageFile));
        }

        userRepository.save(user);
        return ApiResponse.success("Profil mis à jour avec succès", user);
    }

    @Transactional
    public ApiResponse<Void> deleteAccount(Long userId) {
        Optional<User> optUser = userRepository.findById(userId);
        if (optUser.isEmpty()) return ApiResponse.error("Utilisateur non trouvé");

        User user = optUser.get();
        if (user.getCvPath()    != null) fileStorageService.deleteFile(user.getCvPath());
        if (user.getImagePath() != null) fileStorageService.deleteFile(user.getImagePath());
        userRepository.deleteById(userId);
        return ApiResponse.success("Compte supprimé avec succès", null);
    }

    public ApiResponse<List<User>> getAllUsers() {
        return ApiResponse.success("Utilisateurs récupérés", userRepository.findAll());
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .userId(user.getId())
                .imagePath(user.getImagePath())
                .build();
    }




    @Transactional
    public ApiResponse<Void> forgotPassword(ForgotPasswordRequest request) {
        Optional<User> optUser = userRepository.findByEmail(request.getEmail());

        // On répond toujours "succès" pour ne pas divulguer si l'email existe
        if (optUser.isEmpty()) {
            return ApiResponse.success("Si cet email existe, un lien vous a été envoyé.", null);
        }

        User user = optUser.get();

        // Générer un token sécurisé avec expiration 1h
        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), resetToken);

        return ApiResponse.success("Si cet email existe, un lien vous a été envoyé.", null);
    }

    @Transactional
    public ApiResponse<Void> resetPassword(ResetPasswordRequest request) {
        Optional<User> optUser = userRepository.findByPasswordResetToken(request.getToken());

        if (optUser.isEmpty()) {
            return ApiResponse.error("Lien de réinitialisation invalide ou expiré.");
        }

        User user = optUser.get();

        if (user.getPasswordResetTokenExpiry() == null ||
                user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ApiResponse.error("Lien de réinitialisation expiré. Veuillez faire une nouvelle demande.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        return ApiResponse.success("Mot de passe réinitialisé avec succès.", null);
    }


}