package com.recruitment.application.repository;

import com.recruitment.application.model.ApplicationStatus;
import com.recruitment.application.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    Optional<JobApplication> findByJobIdAndCandidateId(Long jobId, Long candidateId);

    boolean existsByJobIdAndCandidateId(Long jobId, Long candidateId);

    /** Toutes les candidatures reçues pour une offre (COMPANY) */
    List<JobApplication> findByJobIdOrderByAppliedAtDesc(Long jobId);

    /** Tous les jobId auxquels un candidat a postulé (pour l'état des boutons côté front) */
    List<JobApplication> findByCandidateId(Long candidateId);

    void deleteByJobIdAndCandidateId(Long jobId, Long candidateId);

    /** Nombre de candidatures envoyées par ce candidat depuis une date donnée (quota d'abonnement). */
    long countByCandidateIdAndAppliedAtAfter(Long candidateId, LocalDateTime since);

    /** Nombre de candidatures reçues pour une offre (utilisé par job-service avant suppression définitive). */
    long countByJobId(Long jobId);

    /**
     * Candidatures dont le score de matching n'a pas pu être calculé (matching-service
     * indisponible au moment de la candidature). Utilisé pour le recalcul en masse (ADMIN).
     */
    List<JobApplication> findByMatchScoreIsNull();

    /**
     * Mise à jour ATOMIQUE et conditionnelle du statut, utilisée par le traitement
     * automatique de clôture d'offre (ApplicationService#processJobClosure).
     *
     * La condition "AND status = EN_COURS_DE_TRAITEMENT" dans le WHERE est ce qui rend
     * l'opération sûre en cas d'appels concurrents (ex : plusieurs endpoints job-service
     * détectant la même offre expirée en même temps) : grâce au verrou de ligne pris par
     * l'UPDATE, un seul appel concurrent peut effectivement changer le statut (renvoie 1),
     * tous les autres ne trouvent plus la ligne à l'état EN_COURS_DE_TRAITEMENT une fois
     * le premier commité et renvoient 0. On n'envoie l'email que si le retour vaut 1,
     * ce qui garantit un seul email par candidature, même en cas de course.
     *
     * @return le nombre de lignes affectées (0 ou 1) : n'envoyer l'email que si == 1.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE JobApplication a SET a.status = :newStatus " +
            "WHERE a.id = :id AND a.status = com.recruitment.application.model.ApplicationStatus.EN_COURS_DE_TRAITEMENT")
    int updateStatusIfPending(@Param("id") Long id, @Param("newStatus") ApplicationStatus newStatus);
}