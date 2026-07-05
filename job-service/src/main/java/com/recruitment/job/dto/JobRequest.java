package com.recruitment.job.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class JobRequest {
    private String title;
    private String description;
    private List<String> skills;
    private Double salary;
    private String workSchedule;
    private String companyName;
    private String contactEmail;
    private String contactPhone;

    /** Date de clôture choisie par le recruteur : doit être postérieure à la date courante */
    private LocalDateTime dateCloture;

    /** Date de l'entretien : doit être postérieure à la date de clôture */
    private LocalDateTime dateEntretien;
}