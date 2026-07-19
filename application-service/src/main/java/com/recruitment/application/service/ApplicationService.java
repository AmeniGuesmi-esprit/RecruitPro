package com.recruitment.application.service;

import com.recruitment.application.client.JobClient;
import com.recruitment.application.client.JobInfo;
import com.recruitment.application.client.MatchScoreResponse;
import com.recruitment.application.client.MatchingClient;
import com.recruitment.application.client.SubscriptionClient;
import com.recruitment.application.client.SubscriptionInfo;
import com.recruitment.application.client.UserClient;
import com.recruitment.application.client.UserInfo;
import com.recruitment.application.dto.ApplicationResponse;
import com.recruitment.application.exception.SubscriptionRequiredException;
import com.recruitment.application.model.ApplicationStatus;
import com.recruitment.application.model.JobApplication;
import com.recruitment.application.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApplicationService {

    private final JobApplicationRepository repository;
    private final JobClient jobClient;
    private final UserClient userClient;
    private final SubscriptionClient subscriptionClient;
    private final MatchingClient matchingClient;
    private final EmailService emailService;

    @Value("${app.base-url}")
    private String baseUrl;

    /** Nombre maximum de candidats acceptés pour entretien à la clôture d'une offre. */
    @Value("${app.matching.max-accepted:5}")
    private int maxAccepted;

    /** Score de matching minimum (exclusif) pour être éligible à l'acceptation. */
    @Value("${app.matching.min-score:70}")
    private double minScore;

    // ── Postuler ─────────────────────────────────────────────────────────────
    @Transactional
    public ApplicationResponse apply(Long jobId, Long candidateId) {
        checkSubscriptionQuota(candidateId);

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

        // ── Matching IA : calculé UNE FOIS au moment de la candidature (snapshot,
        //    comme le nom/email/CV recopiés ci-dessous), pour ne pas dépendre de
        //    la disponibilité du matching-service à chaque affichage de la liste. ──
        Double matchScore = computeMatchScore(job, candidate.getCvPath());

        JobApplication application = JobApplication.builder()
                .jobId(jobId)
                .candidateId(candidateId)
                .candidateFirstName(candidate.getFirstName())
                .candidateLastName(candidate.getLastName())
                .candidateEmail(candidate.getEmail())
                .candidateCvPath(candidate.getCvPath())
                .matchScore(matchScore)
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
    // Triés par score de matching décroissant : les candidats les plus
    // pertinents apparaissent en premier dans la liste du recruteur.
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
                .sorted((a, b) -> Double.compare(
                        b.getMatchScore() != null ? b.getMatchScore() : -1,
                        a.getMatchScore() != null ? a.getMatchScore() : -1))
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
                .sorted((a, b) -> Double.compare(
                        b.getMatchScore() != null ? b.getMatchScore() : -1,
                        a.getMatchScore() != null ? a.getMatchScore() : -1))
                .toList();
    }

    // ── ADMIN : nombre total de candidatures sur la plateforme ───────────────
    public long countAll() {
        return repository.count();
    }

    // ── INTERNE (job-service) : nombre de candidatures pour une offre ────────
    // Appelé par job-service avant suppression définitive d'une offre (voir
    // ApplicationController#countForJobInternal). Pas de vérification de
    // propriétaire : appel interne service-à-service, pas exposé au frontend.
    public long countByJob(Long jobId) {
        return repository.countByJobId(jobId);
    }

    // ── INTERNE (job-service) : traitement automatique à la clôture d'une offre ──
    /**
     * Appelé par job-service (via ApplicationClient) juste après qu'une offre soit
     * passée au statut CLOTURE (expiration de la date de clôture). Parmi les
     * candidatures encore EN_COURS_DE_TRAITEMENT pour cette offre :
     *  - les {@code maxAccepted} (par défaut 5) meilleures ayant un score de matching
     *    strictement supérieur à {@code minScore}% (par défaut 70%) passent à
     *    ACCEPTEE_POUR_ENTRETIEN et reçoivent un email avec la date d'entretien.
     *    S'il y a moins de {@code maxAccepted} candidats au-dessus du seuil, seuls
     *    ceux-ci sont acceptés (le nombre d'acceptés ne dépasse jamais {@code maxAccepted}).
     *  - toutes les autres passent à REFUSEE et reçoivent un email de refus.
     *
     * Idempotent ET sûr en cas d'appels concurrents (voir
     * JobApplicationRepository#updateStatusIfPending) : même si job-service déclenche
     * plusieurs fois ce traitement pour la même offre en même temps (ex : plusieurs
     * endpoints détectant la même offre expirée quasi simultanément), chaque candidature
     * n'est effectivement mise à jour, et donc ne déclenche l'envoi d'un email, qu'une
     * seule fois.
     */
    @Transactional
    public void processJobClosure(Long jobId) {
        List<JobApplication> pending = repository.findByJobIdOrderByAppliedAtDesc(jobId).stream()
                .filter(a -> a.getStatus() == ApplicationStatus.EN_COURS_DE_TRAITEMENT)
                .toList();
        if (pending.isEmpty()) {
            return;
        }

        JobInfo job = jobClient.getJob(jobId);
        String jobTitle = job != null ? job.getTitle() : "l'offre";
        String companyName = job != null ? job.getCompanyName() : null;
        LocalDateTime dateEntretien = job != null ? job.getDateEntretien() : null;

        long alreadyAccepted = repository.findByJobIdOrderByAppliedAtDesc(jobId).stream()
                .filter(a -> a.getStatus() == ApplicationStatus.ACCEPTEE_POUR_ENTRETIEN)
                .count();
        int remainingSlots = (int) Math.max(0, maxAccepted - alreadyAccepted);

        List<JobApplication> eligible = pending.stream()
                .filter(a -> a.getMatchScore() != null && a.getMatchScore() > minScore)
                .sorted((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()))
                .toList();

        Set<Long> toAcceptIds = eligible.stream()
                .limit(remainingSlots)
                .map(JobApplication::getId)
                .collect(Collectors.toSet());

        for (JobApplication application : pending) {
            ApplicationStatus targetStatus = toAcceptIds.contains(application.getId())
                    ? ApplicationStatus.ACCEPTEE_POUR_ENTRETIEN
                    : ApplicationStatus.REFUSEE;

            // Mise à jour atomique : si 0 ligne affectée, une autre exécution concurrente
            // a déjà traité (et notifié) cette candidature entre-temps → on ne renvoie pas l'email.
            int updated = repository.updateStatusIfPending(application.getId(), targetStatus);
            if (updated == 0) {
                continue;
            }

            if (targetStatus == ApplicationStatus.ACCEPTEE_POUR_ENTRETIEN) {
                emailService.sendInterviewEmail(
                        application.getCandidateEmail(), application.getCandidateFirstName(),
                        jobTitle, companyName, dateEntretien);
            } else {
                emailService.sendRejectionEmail(
                        application.getCandidateEmail(), application.getCandidateFirstName(),
                        jobTitle, companyName);
            }
        }
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

    // ── Recalcul du score de matching (COMPANY) ──────────────────────────────
    /**
     * Recalcule le score de matching d'une candidature dont le calcul avait échoué
     * au moment de la candidature (matching-service indisponible, CV absent à
     * l'époque, etc.). Ne fait rien de plus qu'appeler matching-service à nouveau
     * et sauvegarder le nouveau score en base ; renvoie toujours la candidature
     * à jour, que le score ait pu être calculé ou non.
     */
    @Transactional
    public ApplicationResponse recomputeScore(Long applicationId, Long recruiterId) {
        JobApplication application = repository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidature introuvable"));

        JobInfo job = jobClient.getJob(application.getJobId());
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Offre introuvable");
        }
        if (!recruiterId.equals(job.getRecruiterId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette offre ne vous appartient pas");
        }

        Double matchScore = computeMatchScore(job, application.getCandidateCvPath());
        application.setMatchScore(matchScore);
        return toResponse(repository.save(application));
    }

    // ── ADMIN : recalcul en masse de toutes les candidatures sans score ──────
    /**
     * Repasse sur toutes les candidatures avec matchScore == null (typiquement dues
     * à une indisponibilité passée de matching-service) et retente le calcul.
     * @return le nombre de candidatures dont le score a pu être calculé.
     */
    @Transactional
    public int recomputeAllNullScores() {
        List<JobApplication> pending = repository.findByMatchScoreIsNull();
        int updated = 0;
        for (JobApplication application : pending) {
            JobInfo job = jobClient.getJob(application.getJobId());
            if (job == null) {
                continue;
            }
            Double matchScore = computeMatchScore(job, application.getCandidateCvPath());
            if (matchScore != null) {
                application.setMatchScore(matchScore);
                repository.save(application);
                updated++;
            }
        }
        return updated;
    }

    // ── Abonnement ───────────────────────────────────────────────────────────
    /**
     * Vérifie que le candidat a un abonnement actif et n'a pas dépassé le quota de
     * candidatures autorisé pour la période en cours, avant de le laisser postuler.
     * - Pas d'abonnement du tout → SubscriptionRequiredException(NO_SUBSCRIPTION),
     *   le contrôleur renvoie 200 + success=false + code, front redirige vers la page abonnement.
     * - Abonnement présent mais quota atteint → SubscriptionRequiredException(QUOTA_EXCEEDED),
     *   idem, pour renouveler l'abonnement.
     */
    private void checkSubscriptionQuota(Long candidateId) {
        SubscriptionInfo subscription = subscriptionClient.getActiveSubscription(candidateId);
        if (subscription == null) {
            throw new SubscriptionRequiredException(SubscriptionRequiredException.NO_SUBSCRIPTION,
                    "Vous n'avez pas d'abonnement actif. Veuillez souscrire à un abonnement pour postuler.");
        }
        long candidaturesEnvoyees = repository.countByCandidateIdAndAppliedAtAfter(candidateId, subscription.getDateDebut());
        if (candidaturesEnvoyees >= subscription.getQuota()) {
            throw new SubscriptionRequiredException(SubscriptionRequiredException.QUOTA_EXCEEDED,
                    "Vous avez atteint le nombre de candidatures autorisées par votre abonnement. Veuillez le renouveler.");
        }
    }

    // ── Matching IA ──────────────────────────────────────────────────────────
    /**
     * Calcule le score de matching CV <-> offre via matching-service.
     * Ne lève jamais d'exception : si le CV est absent ou si le service est
     * indisponible, renvoie null (le candidat peut toujours postuler).
     */
    private Double computeMatchScore(JobInfo job, String candidateCvPath) {
        String cvUrl = buildCvUrl(candidateCvPath);
        if (cvUrl == null) {
            return null;
        }
        try {
            MatchScoreResponse result = matchingClient.computeMatchScore(job.getSkills(), job.getDescription(), cvUrl);
            return result != null ? result.getMatchScore() : null;
        } catch (Exception e) {
            log.warn("Échec du calcul du score de matching pour l'offre {} : {}", job.getId(), e.getMessage());
            return null;
        }
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
                .matchScore(a.getMatchScore())
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