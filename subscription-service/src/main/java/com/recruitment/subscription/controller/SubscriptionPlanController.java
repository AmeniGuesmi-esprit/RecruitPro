package com.recruitment.subscription.controller;

import com.recruitment.subscription.dto.ApiResponse;
import com.recruitment.subscription.dto.PlanRequest;
import com.recruitment.subscription.dto.PlanResponse;
import com.recruitment.subscription.model.SubscriptionType;
import com.recruitment.subscription.service.SubscriptionPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions/plans")
@RequiredArgsConstructor
public class SubscriptionPlanController {

    private final SubscriptionPlanService planService;

    // ── ADMIN : créer un plan (COMPANY : montant + nb offres, CANDIDATE : montant + nb candidatures) ──
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PlanResponse>> createPlan(@RequestBody PlanRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Plan créé", planService.createPlan(request)));
    }

    // ── ADMIN : modifier un plan ──────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PlanResponse>> updatePlan(@PathVariable Long id, @RequestBody PlanRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Plan mis à jour", planService.updatePlan(id, request)));
    }

    // ── ADMIN : désactiver un plan ─────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePlan(@PathVariable Long id) {
        planService.deletePlan(id);
        return ResponseEntity.ok(ApiResponse.ok("Plan désactivé", null));
    }

    // ── ADMIN : tous les plans, actifs et inactifs ────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PlanResponse>>> getAllPlans() {
        return ResponseEntity.ok(ApiResponse.ok("Plans d'abonnement", planService.getAllPlans()));
    }

    // ── COMPANY / CANDIDATE : plans actifs disponibles pour son propre type ──
    @GetMapping("/type/{type}")
    public ResponseEntity<ApiResponse<List<PlanResponse>>> getPlansByType(@PathVariable SubscriptionType type) {
        return ResponseEntity.ok(ApiResponse.ok("Plans disponibles", planService.getActivePlansByType(type)));
    }
}
