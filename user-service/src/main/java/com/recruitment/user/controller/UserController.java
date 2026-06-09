package com.recruitment.user.controller;

import com.recruitment.user.dto.*;
import com.recruitment.user.model.User;
import com.recruitment.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Value("${app.image-upload-dir:uploads/images}")
    private String imageUploadDir;

    @Value("${app.upload-dir:uploads/cv}")
    private String cvUploadDir;

    // ── Servir les fichiers (images + CV) ─────────────────────
    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) throws Exception {
        // Chercher d'abord dans images, puis dans cv
        Path imagePath = Paths.get(imageUploadDir).resolve(filename).normalize();
        Path cvPath    = Paths.get(cvUploadDir).resolve(filename).normalize();

        Path filePath;
        if (Files.exists(imagePath)) {
            filePath = imagePath;
        } else if (Files.exists(cvPath)) {
            filePath = cvPath;
        } else {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        String contentType = Files.probeContentType(filePath);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    // ── CRUD utilisateur ──────────────────────────────────────
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping(value = "/{userId}", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<User>> updateProfile(
            @PathVariable Long userId,
            @Valid @ModelAttribute UpdateProfileRequest request,
            @RequestParam(value = "cv",    required = false) MultipartFile cvFile,
            @RequestParam(value = "image", required = false) MultipartFile imageFile) throws Exception {
        return ResponseEntity.ok(userService.updateProfile(userId, request, cvFile, imageFile));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.deleteAccount(userId));
    }

    // Admin only
    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
}