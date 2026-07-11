package com.recruitment.subscription.service;

import com.recruitment.subscription.dto.PlanRequest;
import com.recruitment.subscription.dto.PlanResponse;
import com.recruitment.subscription.model.SubscriptionPlan;
import com.recruitment.subscription.model.SubscriptionType;
import com.recruitment.subscription.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

    private final SubscriptionPlanRepository repository;

    @Transactional
    public PlanResponse createPlan(PlanRequest req) {
        validate(req);
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .name(req.getName())
                .type(req.getType())
                .montant(req.getMontant())
                .quota(req.getQuota())
                .dureeJours(req.getDureeJours())
                .description(req.getDescription())
                .active(true)
                .build();
        return toResponse(repository.save(plan));
    }

    @Transactional
    public PlanResponse updatePlan(Long id, PlanRequest req) {
        validate(req);
        SubscriptionPlan plan = findOrThrow(id);
        plan.setName(req.getName());
        plan.setType(req.getType());
        plan.setMontant(req.getMontant());
        plan.setQuota(req.getQuota());
        plan.setDureeJours(req.getDureeJours());
        plan.setDescription(req.getDescription());
        return toResponse(repository.save(plan));
    }

    @Transactional
    public void deletePlan(Long id) {
        SubscriptionPlan plan = findOrThrow(id);
        // On désactive plutôt que de supprimer physiquement, pour ne pas casser
        // l'historique des souscriptions déjà existantes qui référencent ce plan.
        plan.setActive(false);
        repository.save(plan);
    }

    public List<PlanResponse> getAllPlans() {
        return repository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<PlanResponse> getActivePlansByType(SubscriptionType type) {
        return repository.findByTypeAndActiveTrue(type).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public SubscriptionPlan findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan d'abonnement introuvable"));
    }

    private void validate(PlanRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom du plan est obligatoire.");
        }
        if (req.getType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le type (COMPANY / CANDIDATE) est obligatoire.");
        }
        if (req.getMontant() == null || req.getMontant() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le montant doit être positif ou nul.");
        }
        if (req.getQuota() == null || req.getQuota() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le quota doit être supérieur à 0.");
        }
        if (req.getDureeJours() == null || req.getDureeJours() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La durée (en jours) doit être supérieure à 0.");
        }
    }

    private PlanResponse toResponse(SubscriptionPlan plan) {
        return PlanResponse.builder()
                .id(plan.getId())
                .name(plan.getName())
                .type(plan.getType())
                .montant(plan.getMontant())
                .quota(plan.getQuota())
                .dureeJours(plan.getDureeJours())
                .description(plan.getDescription())
                .active(plan.isActive())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }
}
