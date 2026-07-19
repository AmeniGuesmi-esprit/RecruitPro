package com.recruitment.application.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Une offre à faire noter par recommendation-service (sous-ensemble de Job). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendJobItem {
    private Long jobId;
    private List<String> jobSkills;
    private String jobDescription;
}
