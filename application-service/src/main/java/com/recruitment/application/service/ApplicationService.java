package com.recruitment.application.service;

import com.recruitment.application.client.JobClient;
import com.recruitment.application.client.JobInfo;
import com.recruitment.application.client.UserClient;
import com.recruitment.application.client.UserInfo;
import com.recruitment.application.dto.ApplicationResponse;
import com.recruitment.application.model.ApplicationStatus;
import com.recruitment.application.model.JobApplication;
import com.recruitment.application.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final JobApplicationRepository repository;
    private final JobClient jobClient;
    private final UserClient userClient;

    @Value("${app.base-url}")
    private String baseUrl;

    // ── Postuler ─────────────────────────────────────────────────────────────
    @Transactional
    public ApplicationResponse apply(Long jobId, Long candidateId) {
        JobInfo job = jobClient.getJob(jobId);
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Offre introuvable");
        }
        if (!"PUBLISHED".equals(job.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cette offre n'est plus ouverte aux candidatures");
        }
        if (repository.existsByJobIdAndCandidateId(jobId, candidateId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous avez déjà postulé à cette offre");
        }

        UserInfo candidate = userClient.getUser(candidateId);
        if (candidate == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidat introuvable");
        }

        JobApplication application = JobApplication.builder()
                .jobId(jobId)
                .candidateId(candidateId)
                .candidateFirstName(candidate.getFirstName())
                .candidateLastName(candidate.getLastName())
                .candidateEmail(candidate.getEmail())
                .candidateCvPath(candidate.getCvPath())
                .build();

        return toResponse(repository.save(application));
    }

    // ── Annuler ──────────────────────────────────────────────────────────────
    @Transactional
    public void cancel(Long jobId, Long candidateId) {
        JobApplication application = repository.findByJobIdAndCandidateId(jobId, candidateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidature introuvable"));
        repository.delete(application);
    }

    // ── Mes candidatures (jobIds) — pour l'état des boutons côté front ───────
    public List<Long> getMyAppliedJobIds(Long candidateId) {
        return repository.findByCandidateId(candidateId).stream()
                .map(JobApplication::getJobId)
                .toList();
    }

    // ── Mes candidatures complètes (avec statut) — pour l'affichage du statut côté front ─
    public List<ApplicationResponse> getMyApplications(Long candidateId) {
        return repository.findByCandidateId(candidateId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Candidats d'une offre (COMPANY, doit être le recruteur propriétaire) ─
    public List<ApplicationResponse> getApplicationsForJob(Long jobId, Long recruiterId) {
        JobInfo job = jobClient.getJob(jobId);
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Offre introuvable");
        }
        if (!recruiterId.equals(job.getRecruiterId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette offre ne vous appartient pas");
        }
        return repository.findByJobIdOrderByAppliedAtDesc(jobId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── ADMIN : candidats d'une offre, sans vérification de propriétaire ─────
    public List<ApplicationResponse> getApplicationsForJobAdmin(Long jobId) {
        JobInfo job = jobClient.getJob(jobId);
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Offre introuvable");
        }
        return repository.findByJobIdOrderByAppliedAtDesc(jobId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── ADMIN : nombre total de candidatures sur la plateforme ───────────────
    public long countAll() {
        return repository.count();
    }

    // ── Changer le statut d'une candidature (COMPANY, doit être le recruteur propriétaire) ─
    @Transactional
    public ApplicationResponse updateStatus(Long applicationId, Long recruiterId, ApplicationStatus newStatus) {
        JobApplication application = repository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidature introuvable"));

        JobInfo job = jobClient.getJob(application.getJobId());
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Offre introuvable");
        }
        if (!recruiterId.equals(job.getRecruiterId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette offre ne vous appartient pas");
        }

        application.setStatus(newStatus);
        return toResponse(repository.save(application));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private ApplicationResponse toResponse(JobApplication a) {
        return ApplicationResponse.builder()
                .id(a.getId())
                .jobId(a.getJobId())
                .candidateId(a.getCandidateId())
                .candidateFirstName(a.getCandidateFirstName())
                .candidateLastName(a.getCandidateLastName())
                .candidateEmail(a.getCandidateEmail())
                .cvUrl(buildCvUrl(a.getCandidateCvPath()))
                .status(a.getStatus())
                .appliedAt(a.getAppliedAt())
                .build();
    }

    private String buildCvUrl(String cvPath) {
        if (cvPath == null || cvPath.isBlank()) return null;
        String normalized = cvPath.replace("\\", "/");
        String filename = normalized.substring(normalized.lastIndexOf('/') + 1);
        return baseUrl + "/api/users/files/" + filename;
    }
}