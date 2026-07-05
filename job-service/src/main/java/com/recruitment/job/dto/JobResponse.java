package com.recruitment.job.dto;

import com.recruitment.job.model.JobStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class JobResponse {
    private Long id;
    private String title;
    private String description;
    private List<String> skills;
    private Double salary;
    private String workSchedule;
    private String companyName;
    private String logoUrl;          // URL complète exposée au front
    private String contactEmail;
    private String contactPhone;
    private Long recruiterId;

    /** PUBLISHED ou ARCHIVED */
    private JobStatus status;

    private LocalDateTime dateDebut;
    private LocalDateTime dateCloture;
    private LocalDateTime dateEntretien;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}