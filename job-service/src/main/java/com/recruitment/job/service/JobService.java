package com.recruitment.job.service;

import com.recruitment.job.client.ApplicationClient;
import com.recruitment.job.client.SubscriptionClient;
import com.recruitment.job.client.SubscriptionInfo;
import com.recruitment.job.dto.CanCreateResponse;
import com.recruitment.job.dto.JobRequest;
import com.recruitment.job.dto.JobResponse;
import com.recruitment.job.model.Job;
import com.recruitment.job.model.JobStatus;
import com.recruitment.job.repository.JobRepository;
import com.recruitment.job.repository.JobSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final FileStorageService fileStorageService;
    private final SubscriptionClient subscriptionClient;
    private final ApplicationClient applicationClient;

    /** Statuts visibles publiquement : PUBLISHED (postulable) + CLOTURE (visible, non postulable). ARCHIVED reste caché. */
    private static final List<JobStatus> PUBLIC_STATUSES = List.of(JobStatus.PUBLISHED, JobStatus.CLOTURE);

    @Value("${app.base-url:http://localhost:8222}")
    private String baseUrl;

    // ── Création ────────────────────────────────────────────────────────────────

    public JobResponse createJob(JobRequest req, MultipartFile logo, Long recruiterId) throws IOException {
        checkSubscriptionQuota(recruiterId);
        validateDateCloture(req.getDateCloture());
        LocalDateTime dateEntretien = normalizeDateEntretien(req.getDateEntretien());
        validateDateEntretien(req.getDateCloture(), dateEntretien);

        String logoPath = null;
        if (logo != null && !logo.isEmpty()) {
            logoPath = fileStorageService.storeLogo(logo);
        }

        Job job = Job.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .skills(req.getSkills())
                .salary(req.getSalary())
                .workSchedule(req.getWorkSchedule())
                .companyName(req.getCompanyName())
                .logoPath(logoPath)
                .contactEmail(req.getContactEmail())
                .contactPhone(req.getContactPhone())
                .recruiterId(recruiterId)
                .status(JobStatus.PUBLISHED)
                .dateDebut(LocalDateTime.now())
                .dateCloture(req.getDateCloture())
                .dateEntretien(dateEntretien)
                .build();

        return toResponse(jobRepository.save(job));
    }

    // ── Lecture ──────────────────────────────────────────────────────────────────

    /** Offres publiques : PUBLISHED + CLOTURE (non expirées PUBLISHED d'abord basculées automatiquement). */
    @Transactional
    public List<JobResponse> getAllActiveJobs() {
        // Archivage inline (évite le problème d'auto-invocation Spring AOP)
        closeExpiredJobs();
        return jobRepository.findByStatusIn(PUBLIC_STATUSES).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Recherche/filtre côté backend (remplace le filtrage en mémoire côté front).
     * @param q texte libre saisi dans la barre de recherche (peut contenir un nombre
     *          pour le salaire min et/ou un régime horaire, en plus du texte libre).
     */
    @Transactional
    public List<JobResponse> searchActiveJobs(String q) {
        // Archivage inline (mêmes raisons que ci-dessus)
        closeExpiredJobs();

        Specification<Job> spec = JobSpecifications.search(q, PUBLIC_STATUSES);
        return jobRepository.findAll(spec).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Offres du recruteur connecté : toutes, quel que soit le statut. */
    @Transactional
    public List<JobResponse> getJobsByRecruiter(Long recruiterId) {
        // Archivage inline (évite le problème d'auto-invocation Spring AOP)
        closeExpiredJobs();
        return jobRepository.findByRecruiterId(recruiterId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public JobResponse getJobById(Long id) {
        return toResponse(findOrThrow(id));
    }

    /** ADMIN : toutes les offres, tous statuts confondus (PUBLISHED, CLOTURE, ARCHIVED). */
    @Transactional
    public List<JobResponse> getAllJobsAdmin() {
        closeExpiredJobs();
        return jobRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Mise à jour ──────────────────────────────────────────────────────────────

    public JobResponse updateJob(Long id, JobRequest req, MultipartFile logo, Long recruiterId) throws IOException {
        Job job = findOrThrow(id);
        if (!job.getRecruiterId().equals(recruiterId)) {
            throw new SecurityException("Non autorisé");
        }
        validateDateCloture(req.getDateCloture());
        LocalDateTime dateEntretien = normalizeDateEntretien(req.getDateEntretien());
        validateDateEntretien(req.getDateCloture(), dateEntretien);

        job.setTitle(req.getTitle());
        job.setDescription(req.getDescription());
        job.setSkills(req.getSkills());
        job.setSalary(req.getSalary());
        job.setWorkSchedule(req.getWorkSchedule());
        job.setCompanyName(req.getCompanyName());
        job.setContactEmail(req.getContactEmail());
        job.setContactPhone(req.getContactPhone());
        job.setDateCloture(req.getDateCloture());
        job.setDateEntretien(dateEntretien);

        if (logo != null && !logo.isEmpty()) {
            if (job.getLogoPath() != null) fileStorageService.deleteLogo(job.getLogoPath());
            job.setLogoPath(fileStorageService.storeLogo(logo));
        }

        return toResponse(jobRepository.save(job));
    }

    // ── Archivage ────────────────────────────────────────────────────────────────

    /** Archivage manuel déclenché par le recruteur (remplace l'ancienne suppression). */
    @Transactional
    public JobResponse archiveJob(Long id, Long recruiterId) {
        Job job = findOrThrow(id);
        if (!job.getRecruiterId().equals(recruiterId)) throw new SecurityException("Non autorisé");
        job.setStatus(JobStatus.ARCHIVED);
        return toResponse(jobRepository.save(job));
    }

    /**
     * Suppression DÉFINITIVE d'une offre, réservée aux offres n'ayant reçu AUCUNE
     * candidature. Si une ou plusieurs candidatures existent déjà, la suppression
     * est refusée (409) : le recruteur doit archiver l'offre à la place (voir
     * archiveJob ci-dessus), pour ne pas perdre l'historique des candidatures.
     */
    @Transactional
    public void deleteJob(Long id, Long recruiterId) {
        Job job = findOrThrow(id);
        if (!job.getRecruiterId().equals(recruiterId)) throw new SecurityException("Non autorisé");

        if (applicationClient.hasApplications(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Impossible de supprimer une offre ayant déjà reçu des candidatures. Archivez-la à la place.");
        }

        if (job.getLogoPath() != null) {
            fileStorageService.deleteLogo(job.getLogoPath());
        }
        jobRepository.delete(job);
    }

    /**
     * Passage automatique au statut CLOTURE : toute offre PUBLISHED dont la
     * date de clôture est dépassée passe à CLOTURE (distinct de ARCHIVED, qui
     * reste réservé à l'archivage manuel par le recruteur). Exécuté
     * périodiquement et avant chaque listing.
     */
    @Scheduled(fixedRate = 5 * 60 * 1000) // toutes les 5 minutes
    @Transactional
    public void archiveExpiredJobs() {
        closeExpiredJobs();
    }

    /**
     * Fait passer au statut CLOTURE toute offre PUBLISHED dont la date de clôture est
     * dépassée, puis notifie application-service pour chaque offre nouvellement clôturée
     * (traitement automatique des candidatures : acceptation des 5 meilleurs candidats
     * avec score > 70%, refus des autres, envoi des emails correspondants — voir
     * ApplicationClient#notifyJobClosure).
     *
     * Comme la requête ne cible que les offres encore PUBLISHED, une offre donnée n'est
     * jamais retournée deux fois par cette méthode : la notification n'est donc envoyée
     * qu'une seule fois par offre, quel que soit le nombre d'appels (idempotent).
     */
    private void closeExpiredJobs() {
        List<Job> expired = jobRepository.findByStatusAndDateClotureBefore(JobStatus.PUBLISHED, LocalDateTime.now());
        if (expired.isEmpty()) return;
        expired.forEach(j -> j.setStatus(JobStatus.CLOTURE));
        jobRepository.saveAll(expired);
        expired.forEach(j -> applicationClient.notifyJobClosure(j.getId()));
    }

    // ── Abonnement ───────────────────────────────────────────────────────────────

    /**
     * Calcule si la company peut créer une nouvelle offre, sans lever d'exception.
     * Utilisé par GET /api/jobs/can-create pour que le frontend vérifie l'abonnement
     * AVANT d'ouvrir le formulaire de création (plutôt qu'après un submit qui échoue).
     */
    public CanCreateResponse canCreateJob(Long recruiterId) {
        SubscriptionInfo subscription = subscriptionClient.getActiveSubscription(recruiterId);
        if (subscription == null) {
            return CanCreateResponse.builder()
                    .canCreate(false)
                    .reason("NO_SUBSCRIPTION")
                    .quota(0)
                    .used(0L)
                    .build();
        }
        long offresPubliees = jobRepository.countByRecruiterIdAndCreatedAtAfter(recruiterId, subscription.getDateDebut());
        if (offresPubliees >= subscription.getQuota()) {
            return CanCreateResponse.builder()
                    .canCreate(false)
                    .reason("QUOTA_EXCEEDED")
                    .quota(subscription.getQuota())
                    .used(offresPubliees)
                    .build();
        }
        return CanCreateResponse.builder()
                .canCreate(true)
                .reason("OK")
                .quota(subscription.getQuota())
                .used(offresPubliees)
                .build();
    }

    /**
     * Vérifie que la company a un abonnement actif et n'a pas dépassé le quota d'offres
     * autorisé pour la période en cours, avant de la laisser créer une nouvelle offre.
     * - Pas d'abonnement du tout → 402, front redirige vers la page abonnement pour en créer un.
     * - Abonnement présent mais quota atteint → 402, front redirige vers la page abonnement
     *   pour le renouveler.
     */
    private void checkSubscriptionQuota(Long recruiterId) {
        CanCreateResponse status = canCreateJob(recruiterId);
        if (!status.isCanCreate()) {
            String message = "NO_SUBSCRIPTION".equals(status.getReason())
                    ? "Vous n'avez pas d'abonnement actif. Veuillez souscrire à un abonnement pour publier une offre."
                    : "Vous avez atteint le nombre d'offres autorisées par votre abonnement. Veuillez le renouveler.";
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, message);
        }
    }

    // ── Utilitaires ──────────────────────────────────────────────────────────────

    /**
     * L'heure de l'entretien est TOUJOURS fixée à 10h00, quelle que soit l'heure
     * saisie par le recruteur : seule la date (jour/mois/année) choisie est conservée.
     */
    private LocalDateTime normalizeDateEntretien(LocalDateTime dateEntretien) {
        if (dateEntretien == null) return null;
        return dateEntretien.toLocalDate().atTime(10, 0);
    }

    private void validateDateCloture(LocalDateTime dateCloture) {
        if (dateCloture == null) {
            throw new IllegalArgumentException("La date de clôture est obligatoire.");
        }
        if (!dateCloture.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("La date de clôture doit être postérieure à la date actuelle.");
        }
    }

    private void validateDateEntretien(LocalDateTime dateCloture, LocalDateTime dateEntretien) {
        if (dateEntretien == null) {
            throw new IllegalArgumentException("La date d'entretien est obligatoire.");
        }
        if (dateCloture != null && !dateEntretien.isAfter(dateCloture)) {
            throw new IllegalArgumentException("La date d'entretien doit être postérieure à la date de clôture.");
        }
    }

    private Job findOrThrow(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Offre introuvable : " + id));
    }

    private JobResponse toResponse(Job job) {
        String logoUrl = job.getLogoPath() != null
                ? baseUrl + "/api/jobs/files/" + job.getLogoPath()
                : null;

        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .skills(job.getSkills())
                .salary(job.getSalary())
                .workSchedule(job.getWorkSchedule())
                .companyName(job.getCompanyName())
                .logoUrl(logoUrl)
                .contactEmail(job.getContactEmail())
                .contactPhone(job.getContactPhone())
                .recruiterId(job.getRecruiterId())
                .status(job.getStatus())
                .dateDebut(job.getDateDebut())
                .dateCloture(job.getDateCloture())
                .dateEntretien(job.getDateEntretien())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}