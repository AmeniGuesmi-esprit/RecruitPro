package com.recruitment.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/** Sous-ensemble des champs de JobResponse (job-service) dont on a besoin ici. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class JobInfo {
    private Long id;
    private String status;      // PUBLISHED, CLOTURE, ARCHIVED
    private Long recruiterId;
    private String title;

    // ── Ajoutés pour le matching CV <-> offre (matching-service) ────────────
    private List<String> skills;
    private String description;
}