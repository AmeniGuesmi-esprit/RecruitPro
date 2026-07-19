package com.recruitment.application.service;

import com.recruitment.application.client.JobClient;
import com.recruitment.application.client.JobInfo;
import com.recruitment.application.client.RecommendJobItem;
import com.recruitment.application.client.RecommendResponse;
import com.recruitment.application.client.RecommendationClient;
import com.recruitment.application.client.RecommendationScoreItem;
import com.recruitment.application.client.UserClient;
import com.recruitment.application.client.UserInfo;
import com.recruitment.application.dto.JobRecommendationResponse;
import com.recruitment.application.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orchestration de la page "Recommandations" du candidat :
 *  1. Récupère le CV du candidat (user-service, via UserClient).
 *  2. Récupère la liste des offres actives (job-service, via JobClient), et
 *     ne garde que celles au statut PUBLISHED (postulables). Les offres
 *     CLOTURE (visibles mais non postulables) et ARCHIVED ne sont jamais
 *     recommandées.
 *  3. Exclut les offres auxquelles le candidat a déjà postulé (on ne
 *     recommande que des offres nouvelles, pas déjà candidatées).
 *  4. Envoie le tout à recommendation-service (Python/FastAPI) qui renvoie
 *     les K offres les plus pertinentes, triées par score décroissant.
 *  5. Combine le score avec le détail de chaque offre pour le frontend.
 *
 * Renvoie une liste vide (jamais d'exception) si le candidat n'a pas de CV,
 * s'il n'y a aucune offre éligible, ou si un des microservices amont est
 * indisponible : la page recommandations affiche alors un état vide plutôt
 * que de planter.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private static final String STATUS_PUBLISHED = "PUBLISHED";

    private final JobClient jobClient;
    private final UserClient userClient;
    private final RecommendationClient recommendationClient;
    private final JobApplicationRepository jobApplicationRepository;

    @Value("${app.base-url}")
    private String baseUrl;

    public List<JobRecommendationResponse> getRecommendationsForCandidate(Long candidateId, int limit) {
        UserInfo candidate = userClient.getUser(candidateId);
        if (candidate == null || candidate.getCvPath() == null || candidate.getCvPath().isBlank()) {
            // Pas de CV renseigné : impossible de calculer des recommandations.
            return List.of();
        }
        String cvUrl = buildCvUrl(candidate.getCvPath());

        // Offres déjà candidatées par ce candidat : à exclure des recommandations.
        Set<Long> alreadyAppliedJobIds = jobApplicationRepository.findByCandidateId(candidateId).stream()
                .map(app -> app.getJobId())
                .collect(Collectors.toSet());

        List<JobInfo> jobs = jobClient.getAllPublishedJobs().stream()
                // Uniquement les offres PUBLIÉES (postulables) : on exclut CLOTURE/ARCHIVED.
                .filter(j -> STATUS_PUBLISHED.equalsIgnoreCase(j.getStatus()))
                // On ne recommande pas une offre à laquelle le candidat a déjà postulé.
                .filter(j -> !alreadyAppliedJobIds.contains(j.getId()))
                .collect(Collectors.toList());

        if (jobs.isEmpty()) {
            return List.of();
        }

        List<RecommendJobItem> jobItems = jobs.stream()
                .map(j -> RecommendJobItem.builder()
                        .jobId(j.getId())
                        .jobSkills(j.getSkills() != null ? j.getSkills() : List.of())
                        .jobDescription(j.getDescription() != null ? j.getDescription() : "")
                        .build())
                .collect(Collectors.toList());

        RecommendResponse response = recommendationClient.recommend(cvUrl, jobItems, limit);
        if (response == null || response.getRecommendations() == null) {
            log.warn("Aucune recommandation calculée pour le candidat {} (recommendation-service indisponible ?)", candidateId);
            return List.of();
        }

        Map<Long, JobInfo> jobById = jobs.stream()
                .collect(Collectors.toMap(JobInfo::getId, j -> j, (a, b) -> a));

        return response.getRecommendations().stream()
                .map(rec -> toResponse(jobById.get(rec.getJobId()), rec))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private JobRecommendationResponse toResponse(JobInfo job, RecommendationScoreItem rec) {
        if (job == null) {
            return null; // offre supprimée/clôturée entre les deux appels : on l'ignore proprement
        }
        return JobRecommendationResponse.builder()
                .jobId(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .skills(job.getSkills())
                .salary(job.getSalary())
                .workSchedule(job.getWorkSchedule())
                .companyName(job.getCompanyName())
                .logoUrl(job.getLogoUrl())
                .contactEmail(job.getContactEmail())
                .contactPhone(job.getContactPhone())
                .dateCloture(job.getDateCloture())
                .dateEntretien(job.getDateEntretien())
                .matchScore(rec.getScore())
                .matchedSkills(rec.getMatchedSkills())
                .missingSkills(rec.getMissingSkills())
                .build();
    }

    private String buildCvUrl(String filename) {
        return baseUrl + "/api/users/files/" + filename;
    }
}
