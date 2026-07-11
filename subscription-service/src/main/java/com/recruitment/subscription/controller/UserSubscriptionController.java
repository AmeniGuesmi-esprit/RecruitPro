package com.recruitment.subscription.controller;

import com.recruitment.subscription.dto.ApiResponse;
import com.recruitment.subscription.dto.SubscribeRequest;
import com.recruitment.subscription.dto.UserSubscriptionResponse;
import com.recruitment.subscription.service.UserSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class UserSubscriptionController {

    private final UserSubscriptionService subscriptionService;

    // ── COMPANY / CANDIDATE : souscrire ou renouveler son abonnement ──────────
    @PostMapping("/subscribe")
    @PreAuthorize("hasAnyRole('COMPANY', 'CANDIDATE')")
    public ResponseEntity<ApiResponse<UserSubscriptionResponse>> subscribe(
            @RequestBody SubscribeRequest request, Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        String role = auth.getAuthorities().stream().findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse(null);
        UserSubscriptionResponse response = subscriptionService.subscribe(userId, role, request.getPlanId());
        return ResponseEntity.ok(ApiResponse.ok("Abonnement activé", response));
    }

    // ── COMPANY / CANDIDATE : mon abonnement actif (ou aucun) ─────────────────
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('COMPANY', 'CANDIDATE')")
    public ResponseEntity<ApiResponse<UserSubscriptionResponse>> me(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return subscriptionService.getActiveForUser(userId)
                .map(sub -> ResponseEntity.ok(ApiResponse.ok("Abonnement actif", sub)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("Aucun abonnement actif", null)));
    }

    // ── COMPANY / CANDIDATE : historique de mes abonnements ───────────────────
    @GetMapping("/me/history")
    @PreAuthorize("hasAnyRole('COMPANY', 'CANDIDATE')")
    public ResponseEntity<ApiResponse<List<UserSubscriptionResponse>>> myHistory(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(ApiResponse.ok("Historique des abonnements", subscriptionService.getHistoryForUser(userId)));
    }

    // ── ADMIN : toutes les souscriptions de tous les utilisateurs ─────────────
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserSubscriptionResponse>>> allForAdmin() {
        return ResponseEntity.ok(ApiResponse.ok("Toutes les souscriptions", subscriptionService.getAllForAdmin()));
    }

    // ── INTERNE : consommé par job-service et application-service (pas de JWT propagé,
    //    même principe que job-service#getJob() appelé par application-service). ────────
    @GetMapping("/internal/active/{userId}")
    public ResponseEntity<ApiResponse<UserSubscriptionResponse>> activeForUserInternal(@PathVariable Long userId) {
        return subscriptionService.getActiveForUser(userId)
                .map(sub -> ResponseEntity.ok(ApiResponse.ok("Abonnement actif", sub)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("Aucun abonnement actif", null)));
    }
}
