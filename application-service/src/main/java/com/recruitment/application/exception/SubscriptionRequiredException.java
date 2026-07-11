package com.recruitment.application.exception;

import lombok.Getter;

/**
 * Levée quand un candidat n'a pas d'abonnement actif, ou a épuisé son quota
 * de candidatures. Volontairement PAS une ResponseStatusException : certains
 * environnements (Gateway, proxy) altèrent ou masquent les codes HTTP 4xx,
 * ce qui empêchait le front de détecter fiablement ce cas (il recevait un 403
 * générique au lieu du 402 attendu). Le contrôleur intercepte cette exception
 * et renvoie une réponse HTTP 200 contenant success=false + un code métier
 * ("NO_SUBSCRIPTION" / "QUOTA_EXCEEDED") que le front peut tester sans
 * ambiguïté.
 */
@Getter
public class SubscriptionRequiredException extends RuntimeException {

    public static final String NO_SUBSCRIPTION = "NO_SUBSCRIPTION";
    public static final String QUOTA_EXCEEDED = "QUOTA_EXCEEDED";

    private final String code;

    public SubscriptionRequiredException(String code, String message) {
        super(message);
        this.code = code;
    }
}