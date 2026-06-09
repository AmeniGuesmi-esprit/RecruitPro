package com.recruitment.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload-dir:uploads/cv}")
    private String uploadDir;

    @Value("${app.image-upload-dir:uploads/images}")
    private String imageUploadDir;

    // ── CV (PDF only) ─────────────────────────────────────────
    public String storeCv(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        String contentType = file.getContentType();
        if (!"application/pdf".equals(contentType)) {
            throw new IllegalArgumentException("Seuls les fichiers PDF sont acceptés pour le CV");
        }

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // ✅ Retourner uniquement le nom du fichier (pas le chemin complet)
        return filename;
    }

    // ── Profile image (PNG, JPG, JFIF) ───────────────────────
    public String storeImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        String contentType = file.getContentType();
        List<String> allowed = List.of("image/png", "image/jpeg", "image/pjpeg");
        if (contentType == null || !allowed.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Seuls les formats PNG, JPG et JFIF sont acceptés pour la photo de profil");
        }

        Path uploadPath = Paths.get(imageUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // ✅ Retourner uniquement le nom du fichier (pas le chemin complet)
        return filename;
    }

    // ── Delete any file ───────────────────────────────────────
    public void deleteFile(String filename) {
        if (filename == null) return;
        try {
            // Chercher d'abord dans images, puis dans cv
            Path imagePath = Paths.get(imageUploadDir).resolve(filename);
            Path cvPath    = Paths.get(uploadDir).resolve(filename);
            if (Files.exists(imagePath)) {
                Files.deleteIfExists(imagePath);
            } else {
                Files.deleteIfExists(cvPath);
            }
        } catch (IOException ignored) {}
    }
}