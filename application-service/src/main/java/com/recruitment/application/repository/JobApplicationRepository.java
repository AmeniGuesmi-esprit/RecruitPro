package com.recruitment.application.repository;

import com.recruitment.application.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
