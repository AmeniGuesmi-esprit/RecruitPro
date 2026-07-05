package com.recruitment.job.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class FileStorageService {

    @Value("${app.logo-upload-dir:uploads/logos}")
    private String logoUploadDir;

    /**
     * Stocke le logo de manière synchrone et retourne le nom du fichier.
     * Utilise NIO transferTo pour un I/O non bloquant et plus rapide.
     */
    public String storeLogo(MultipartFile file) throws IOException {
        Path dir = Paths.get(logoUploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.'));
        }
        String filename = UUID.randomUUID() + ext;
        Path target = dir.resolve(filename);

        // transferTo est plus rapide que Files.copy sur l'inputstream
        file.transferTo(target.toFile());
        return filename;
    }

    /**
     * Version asynchrone pour usage non-bloquant (ex: tâches de fond).
     */
    @Async
    public CompletableFuture<String> storeLogoAsync(MultipartFile file) throws IOException {
        return CompletableFuture.completedFuture(storeLogo(file));
    }

    public Resource loadLogo(String filename) throws IOException {
        Path path = Paths.get(logoUploadDir).toAbsolutePath().normalize().resolve(filename);
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists()) throw new IOException("Logo introuvable : " + filename);
        return resource;
    }

    public void deleteLogo(String filename) {
        try {
            Path path = Paths.get(logoUploadDir).toAbsolutePath().normalize().resolve(filename);
            Files.deleteIfExists(path);
        } catch (IOException ignored) {}
    }
}