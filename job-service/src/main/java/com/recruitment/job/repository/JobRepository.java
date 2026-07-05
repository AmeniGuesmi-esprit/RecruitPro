package com.recruitment.job.repository;

import com.recruitment.job.model.Job;
import com.recruitment.job.model.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.time.LocalDateTime;
import java.util.List;

// JpaSpecificationExecutor permet de construire des requêtes dynamiques (voir JobSpecifications)
// nécessaires pour la recherche/filtre côté backend (méthode search()).
public interface JobRepository extends JpaRepository<Job, Long>, JpaSpecificationExecutor<Job> {

    List<Job> findByStatus(JobStatus status);

    List<Job> findByRecruiterId(Long recruiterId);

    List<Job> findByRecruiterIdAndStatus(Long recruiterId, JobStatus status);

    /** Offres encore PUBLISHED dont la date de clôture est déjà dépassée → à archiver automatiquement */
    List<Job> findByStatusAndDateClotureBefore(JobStatus status, LocalDateTime now);
}