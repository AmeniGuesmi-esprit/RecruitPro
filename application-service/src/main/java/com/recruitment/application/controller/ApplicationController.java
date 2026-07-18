package com.recruitment.application.controller;

import com.recruitment.application.dto.ApiResponse;
import com.recruitment.application.dto.ApplicationResponse;
import com.recruitment.application.dto.ApplyRequest;
import com.recruitment.application.dto.UpdateStatusRequest;
import com.recruitment.application.exception.SubscriptionRequiredException;
import com.recruitment.application.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    // ── CANDIDATE : postuler à une offre ─────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<ApplicationResponse>> apply(@RequestBody ApplyRequest request, Authentication auth) {
        Long candidateId = (Long) auth.getCredentials();
        try {
            ApplicationResponse response = applicationService.apply(request.getJobId(), candidateId);
            return ResponseEntity.ok(ApiResponse.ok("Candidature envoyée", response));
        } catch (SubscriptionRequiredException e) {
            // Volontairement HTTP 200 : certains environnements (Gateway/proxy) altèrent les
            // codes 4xx en route, ce qui empêchait le front de détecter fiablement ce cas.
            // Le front distingue ce cas via success=false + code, pas via le statut HTTP.
            return ResponseEntity.ok(ApiResponse.error(e.getMessage(), e.getCode()));
        }
    }

    // ── CANDIDATE : annuler sa candidature ───────────────────────────────────
    @DeleteMapping("/job/{jobId}")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long jobId, Authentication auth) {
        Long candidateId = (Long) auth.getCredentials();
        applicationService.cancel(jobId, candidateId);
        return ResponseEntity.ok(ApiResponse.ok("Candidature annulée", null));
    }

    // ── CANDIDATE : liste des jobId auxquels j'ai postulé ────────────────────
    @GetMapping("/mine")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<List<Long>>> mine(Authentication auth) {
        Long candidateId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Mes candidatures", applicationService.getMyAppliedJobIds(candidateId)));
    }

    // ── CANDIDATE : liste complète de mes candidatures (avec statut) ─────────
    @GetMapping("/mine/details")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> mineDetails(Authentication auth) {
        Long candidateId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Mes candidatures", applicationService.getMyApplications(candidateId)));
    }

    // ── COMPANY : liste des candidats pour une offre ─────────────────────────
    @GetMapping("/job/{jobId}")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> forJob(@PathVariable Long jobId, Authentication auth) {
        Long recruiterId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Candidats", applicationService.getApplicationsForJob(jobId, recruiterId)));
    }

    // ── ADMIN : candidatures d'une offre, sans vérification de propriétaire ──
    @GetMapping("/admin/job/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> forJobAdmin(@PathVariable Long jobId) {
        return ResponseEntity.ok(ApiResponse.ok("Candidats", applicationService.getApplicationsForJobAdmin(jobId)));
    }

    // ── ADMIN : nombre total de candidatures sur la plateforme ───────────────
    @GetMapping("/admin/count")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> countAll() {
        return ResponseEntity.ok(ApiResponse.ok("Total candidatures", applicationService.countAll()));
    }

    // ── INTERNE (job-service) : nombre de candidatures pour une offre ────────
    // Appelé par JobService#deleteJob (via ApplicationClient) avant suppression
    // définitive d'une offre. Pas de JWT propagé lors de cet appel service-à-
    // service : route ouverte via SecurityConfig ("/api/applications/internal/**"),
    // même principe que /api/subscriptions/internal/** côté subscription-service.
    @GetMapping("/internal/count/{jobId}")
    public ResponseEntity<ApiResponse<Long>> countForJobInternal(@PathVariable Long jobId) {
        return ResponseEntity.ok(ApiResponse.ok("Nombre de candidatures", applicationService.countByJob(jobId)));
    }

    // ── COMPANY : changer le statut d'une candidature (accepter / refuser) ───
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<ApplicationResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request,
            Authentication auth) {
        Long recruiterId = (Long) auth.getCredentials();
        ApplicationResponse response = applicationService.updateStatus(id, recruiterId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.ok("Statut mis à jour", response));
    }

    // ── COMPANY : recalculer le score de matching d'une candidature ──────────
    // Utile quand matching-service était indisponible au moment de la
    // candidature (score resté à null) : permet de relancer le calcul sans
    // que le candidat ait besoin de repostuler.
    @PatchMapping("/{id}/recompute-score")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<ApplicationResponse>> recomputeScore(
            @PathVariable Long id, Authentication auth) {
        Long recruiterId = (Long) auth.getCredentials();
        ApplicationResponse response = applicationService.recomputeScore(id, recruiterId);
        return ResponseEntity.ok(ApiResponse.ok("Score recalculé", response));
    }

    // ── ADMIN : recalculer en masse tous les scores manquants (null) ─────────
    // À utiliser une fois après un incident matching-service (ex: le service
    // était down au moment où des candidats ont postulé) pour rattraper tous
    // les scores restés à null en une seule opération.
    @PostMapping("/admin/recompute-null-scores")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> recomputeNullScores() {
        int updated = applicationService.recomputeAllNullScores();
        return ResponseEntity.ok(ApiResponse.ok(updated + " score(s) recalculé(s)", updated));
    }
}