package com.recruitment.subscription.service;

import com.recruitment.subscription.dto.UserSubscriptionResponse;
import com.recruitment.subscription.model.SubscriptionPlan;
import com.recruitment.subscription.model.SubscriptionStatus;
import com.recruitment.subscription.model.SubscriptionType;
import com.recruitment.subscription.model.UserSubscription;
import com.recruitment.subscription.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserSubscriptionService {

    private final UserSubscriptionRepository repository;
    private final SubscriptionPlanService planService;

    /**
     * Souscrire (ou renouveler) un abonnement pour l'utilisateur connecté.
     * Toute souscription ACTIVE précédente est automatiquement clôturée (EXPIRED),
     * et une nouvelle période démarre à partir de maintenant avec le quota du plan choisi.
     */
    @Transactional
    public UserSubscriptionResponse subscribe(Long userId, String role, Long planId) {
        SubscriptionPlan plan = planService.findOrThrow(planId);
        if (!plan.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce plan n'est plus disponible.");
        }

        SubscriptionType expectedType = "COMPANY".equals(role) ? SubscriptionType.COMPANY : SubscriptionType.CANDIDATE;
        if (plan.getType() != expectedType) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ce plan ne correspond pas à votre type de compte.");
        }

        // Clôturer l'abonnement actif précédent, s'il existe
        repository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, SubscriptionStatus.ACTIVE)
                .ifPresent(old -> {
                    old.setStatus(SubscriptionStatus.EXPIRED);
                    repository.save(old);
                });

        LocalDateTime now = LocalDateTime.now();
        UserSubscription sub = UserSubscription.builder()
                .userId(userId)
                .type(plan.getType())
                .planId(plan.getId())
                .planName(plan.getName())
                .montant(plan.getMontant())
                .quota(plan.getQuota())
                .dateDebut(now)
                .dateFin(now.plusDays(plan.getDureeJours()))
                .status(SubscriptionStatus.ACTIVE)
                .build();

        return toResponse(repository.save(sub));
    }

    /** Abonnement actif courant de l'utilisateur (candidat ou société), ou vide si aucun / expiré. */
    @Transactional
    public Optional<UserSubscriptionResponse> getActiveForUser(Long userId) {
        expireIfNeeded(userId);
        return repository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, SubscriptionStatus.ACTIVE)
                .map(this::toResponse);
    }

    public List<UserSubscriptionResponse> getHistoryForUser(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** ADMIN : toutes les souscriptions, toutes users confondus. */
    public List<UserSubscriptionResponse> getAllForAdmin() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Passe une souscription ACTIVE à EXPIRED si sa dateFin est dépassée. */
    private void expireIfNeeded(Long userId) {
        repository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, SubscriptionStatus.ACTIVE)
                .filter(sub -> sub.getDateFin().isBefore(LocalDateTime.now()))
                .ifPresent(sub -> {
                    sub.setStatus(SubscriptionStatus.EXPIRED);
                    repository.save(sub);
                });
    }

    /** Nettoyage périodique global (au cas où l'utilisateur ne revient pas vérifier lui-même). */
    @Scheduled(fixedRate = 15 * 60 * 1000) // toutes les 15 minutes
    @Transactional
    public void expireOutdatedSubscriptions() {
        List<UserSubscription> expired =
                repository.findByStatusAndDateFinBefore(SubscriptionStatus.ACTIVE, LocalDateTime.now());
        if (expired.isEmpty()) return;
        expired.forEach(s -> s.setStatus(SubscriptionStatus.EXPIRED));
        repository.saveAll(expired);
    }

    private UserSubscriptionResponse toResponse(UserSubscription s) {
        return UserSubscriptionResponse.builder()
                .id(s.getId())
                .userId(s.getUserId())
                .type(s.getType())
                .planId(s.getPlanId())
                .planName(s.getPlanName())
                .montant(s.getMontant())
                .quota(s.getQuota())
                .dateDebut(s.getDateDebut())
                .dateFin(s.getDateFin())
                .status(s.getStatus())
                .build();
    }
}
