package com.recruitment.job.repository;

import com.recruitment.job.model.Job;
import com.recruitment.job.model.JobStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Construit dynamiquement la requête de recherche/filtre des offres.
 *
 * Reprend la logique de parsing qui était auparavant côté front
 * (jobs.component.ts::parseQuery / applyFilters) :
 *   - un token numérique          -> salaire minimum (salary >= n)
 *   - un token = un régime connu  -> filtre sur workSchedule
 *   - tout le reste (texte libre) -> chaque mot doit matcher le titre,
 *                                     la société OU une compétence
 */
public final class JobSpecifications {

    private JobSpecifications() {}

    private static final List<String> SCHEDULES = List.of(
            "CDI", "CDD", "Temps partiel", "Freelance", "Stage", "Alternance"
    );

    public static Specification<Job> search(String rawQuery, Collection<JobStatus> statuses) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }

            if (rawQuery != null && !rawQuery.isBlank()) {
                String[] tokens = rawQuery.trim().split("\\s+");
                List<String> freeTextTokens = new ArrayList<>();

                for (String token : tokens) {
                    // Token numérique -> salaire minimum
                    if (token.matches("\\d+")) {
                        double min = Double.parseDouble(token);
                        predicates.add(cb.greaterThanOrEqualTo(root.get("salary"), min));
                        continue;
                    }

                    // Token correspondant à un régime horaire (insensible à la casse)
                    String matchedSchedule = SCHEDULES.stream()
                            .filter(s -> s.equalsIgnoreCase(token))
                            .findFirst()
                            .orElse(null);
                    if (matchedSchedule != null) {
                        predicates.add(cb.equal(root.get("workSchedule"), matchedSchedule));
                        continue;
                    }

                    freeTextTokens.add(token);
                }

                // Chaque mot restant doit matcher titre OU société OU (au moins) une compétence.
                // On utilise une sous-requête corrélée pour les compétences afin d'éviter
                // qu'un JOIN partagé entre plusieurs tokens ne force la comparaison sur
                // la même ligne de compétence (ce qui casserait les recherches multi-mots
                // du type "java react").
                for (String token : freeTextTokens) {
                    String like = "%" + token.toLowerCase() + "%";

                    Subquery<Long> skillSubquery = query.subquery(Long.class);
                    var skillRoot = skillSubquery.from(Job.class);
                    Join<Job, String> skillJoin = skillRoot.join("skills");
                    skillSubquery.select(skillRoot.get("id"))
                            .where(
                                    cb.equal(skillRoot.get("id"), root.get("id")),
                                    cb.like(cb.lower(skillJoin), like)
                            );

                    Predicate matchesTitle   = cb.like(cb.lower(root.get("title")), like);
                    Predicate matchesCompany = cb.like(cb.lower(root.get("companyName")), like);
                    Predicate matchesSkill   = cb.exists(skillSubquery);

                    predicates.add(cb.or(matchesTitle, matchesCompany, matchesSkill));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}