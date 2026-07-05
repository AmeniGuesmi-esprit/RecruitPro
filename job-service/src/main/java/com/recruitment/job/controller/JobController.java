package com.recruitment.job.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitment.job.dto.ApiResponse;
import com.recruitment.job.dto.JobRequest;
import com.recruitment.job.dto.JobResponse;
import com.recruitment.job.service.FileStorageService;
import com.recruitment.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    // ── PUBLIC : liste toutes les offres actives ─────────────────────────────────
    @GetMapping
    public ResponseEntity<ApiResponse<List<JobResponse>>> getAllJobs() {
        return ResponseEntity.ok()
                // Désactivation du cache : toujours renvoyer la liste à jour
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(ApiResponse.ok("Offres récupérées", jobService.getAllActiveJobs()));
    }

    // ── PUBLIC : recherche/filtre temps réel ─────────────────────────────────────
    // Remplace le filtrage en mémoire côté front (jobs.component.ts::applyFilters).
    // Le front envoie la barre de recherche telle quelle dans "q" ; le parsing
    // (salaire, régime, texte libre) est fait ici, dans JobSpecifications.
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<JobResponse>>> searchJobs(
            @RequestParam(name = "q", required = false, defaultValue = "") String q) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(ApiResponse.ok("Résultats de recherche", jobService.searchActiveJobs(q)));
    }

    // ── PUBLIC : détail d'une offre ──────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> getJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Offre trouvée", jobService.getJobById(id)));
    }

    // ── PUBLIC : logo ────────────────────────────────────────────────────────────
    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> getLogo(@PathVariable String filename) throws IOException {
        Resource resource = fileStorageService.loadLogo(filename);
        String contentType = "image/jpeg";
        String fn = filename.toLowerCase();
        if (fn.endsWith(".png"))  contentType = "image/png";
        else if (fn.endsWith(".gif"))  contentType = "image/gif";
        else if (fn.endsWith(".svg"))  contentType = "image/svg+xml";
        else if (fn.endsWith(".webp")) contentType = "image/webp";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                // Cache logo 24h (les logos changent rarement)
                .cacheControl(CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic())
                .body(resource);
    }

    // ── COMPANY : mes offres ─────────────────────────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<JobResponse>>> getMyJobs(Authentication auth) {
        Long recruiterId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Mes offres", jobService.getJobsByRecruiter(recruiterId)));
    }

    // ── COMPANY : créer une offre (multipart) ────────────────────────────────────
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<JobResponse>> createJob(
            @RequestPart("job") String jobJson,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            Authentication auth) throws IOException {

        JobRequest req = objectMapper.readValue(jobJson, JobRequest.class);
        Long recruiterId = (Long) auth.getCredentials();
        JobResponse response = jobService.createJob(req, logo, recruiterId);
        return ResponseEntity.ok(ApiResponse.ok("Offre créée", response));
    }

    // ── COMPANY : modifier une offre ─────────────────────────────────────────────
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<JobResponse>> updateJob(
            @PathVariable Long id,
            @RequestPart("job") String jobJson,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            Authentication auth) throws IOException {

        JobRequest req = objectMapper.readValue(jobJson, JobRequest.class);
        Long recruiterId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Offre mise à jour", jobService.updateJob(id, req, logo, recruiterId)));
    }

    // ── COMPANY : archiver une offre (remplace l'ancienne suppression) ──────────
    @PatchMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<JobResponse>> archiveJob(@PathVariable Long id, Authentication auth) {
        Long recruiterId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Offre archivée", jobService.archiveJob(id, recruiterId)));
    }
}