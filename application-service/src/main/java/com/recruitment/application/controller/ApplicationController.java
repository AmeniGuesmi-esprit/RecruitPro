package com.recruitment.application.controller;

import com.recruitment.application.dto.ApiResponse;
import com.recruitment.application.dto.ApplicationResponse;
import com.recruitment.application.dto.ApplyRequest;
import com.recruitment.application.dto.UpdateStatusRequest;
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
        ApplicationResponse response = applicationService.apply(request.getJobId(), candidateId);
        return ResponseEntity.ok(ApiResponse.ok("Candidature envoyée", response));
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
}