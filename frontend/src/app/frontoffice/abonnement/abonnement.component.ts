import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { SubscriptionPlan, SubscriptionType, UserSubscription } from '../../core/models/subscription.model';

@Component({
  selector: 'app-abonnement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abonnement.component.html',
  styleUrls: ['./abonnement.component.scss']
})
export class AbonnementComponent implements OnInit {

  loading = true;
  plans: SubscriptionPlan[] = [];
  mySubscription: UserSubscription | null = null;

  errorMsg = '';
  successMsg = '';

  /** Message affiché quand on arrive ici redirigé depuis "Publier une offre" / "Postuler" faute d'abonnement suffisant */
  redirectReason = '';

  /** Nombre d'offres/candidatures déjà consommées sur la période en cours (null tant que non chargé) */
  quotaUsed: number | null = null;

  // ── Paiement (simulation) ──────────────────────────────────────────────────
  /** Plan en cours de paiement (ouvre le modal carte). Null = modal fermé. */
  paymentPlan: SubscriptionPlan | null = null;
  paying = false;
  paymentError = '';

  paymentForm = {
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  };
  paymentErrors: { cardName?: string; cardNumber?: string; expiry?: string; cvc?: string } = {};

  /** MODE TEST : accepte n'importe quel numéro de carte (pas de vérification Luhn),
   *  permet de tester avec des faux numéros. Repasser à `true` avant la mise en
   *  production pour réactiver la vraie vérification de carte. */
  private readonly STRICT_CARD_VALIDATION = false;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private jobService: JobService,
    private applicationService: ApplicationService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'no-subscription') {
      this.redirectReason = "Vous n'avez pas encore d'abonnement actif. Choisissez un abonnement ci-dessous pour continuer.";
    } else if (reason === 'quota-exceeded') {
      this.redirectReason = 'Vous avez atteint le quota autorisé par votre abonnement actuel. Renouvelez-le pour continuer.';
    }

    if (!this.accountType) {
      // Rôle pas encore disponible (ex: rafraîchissement de page trop rapide) → on réessaie une fois
      setTimeout(() => this.load(), 150);
      return;
    }
    this.load();
  }

  get accountType(): SubscriptionType | null {
    const role = this.authService.getRole();
    if (role === 'COMPANY') return 'COMPANY';
    if (role === 'CANDIDATE') return 'CANDIDATE';
    return null; // rôle pas encore chargé (ex: ADMIN, ou état transitoire) → on n'appelle rien tant qu'on ne sait pas
  }

  get quotaLabel(): string {
    return this.accountType === 'COMPANY' ? "offres d'emploi" : 'candidatures';
  }

  /** Libellé court utilisé dans le ring "offres restantes" du hero (espace réduit). */
  get quotaLabelShort(): string {
    return this.accountType === 'COMPANY' ? 'offres' : 'candidatures';
  }

  load() {
    this.loading = true;
    this.subscriptionService.getMySubscription().subscribe({
      next: res => {
        this.mySubscription = res.data ?? null;
        this.loadQuotaUsed();
        this.loadPlans();
      },
      error: () => {
        this.mySubscription = null;
        this.loadPlans();
      }
    });
  }

  /** Charge le nombre d'offres/candidatures déjà consommées, pour afficher le quota restant dans le hero.
   *  Calculé côté front à partir des endpoints déjà existants (mes offres / mes candidatures),
   *  en comptant celles créées depuis le début de la période d'abonnement en cours. */
  private loadQuotaUsed() {
    if (!this.mySubscription) return;
    const since = new Date(this.mySubscription.dateDebut).getTime();
    const type = this.accountType;

    if (type === 'COMPANY') {
      this.jobService.getMyJobs().subscribe({
        next: res => {
          const jobs = res.data ?? [];
          this.quotaUsed = jobs.filter(j => new Date(j.createdAt).getTime() >= since).length;
          this.cdr.detectChanges();
        },
        error: () => { this.quotaUsed = null; }
      });
    } else if (type === 'CANDIDATE') {
      this.applicationService.getMyApplications().subscribe({
        next: res => {
          const apps = res.data ?? [];
          this.quotaUsed = apps.filter(a => new Date(a.appliedAt).getTime() >= since).length;
          this.cdr.detectChanges();
        },
        error: () => { this.quotaUsed = null; }
      });
    }
  }

  private loadPlans() {
    const type = this.accountType;
    if (!type) {
      // Rôle toujours indisponible → on arrête proprement plutôt que d'appeler l'API avec un type erroné
      this.plans = [];
      this.loading = false;
      this.cdr.detectChanges(); // FIX: forcer le rendu (page restait vide sans ça)
      return;
    }
    this.subscriptionService.getPlansByType(type).subscribe({
      next: res => {
        this.plans = res.data ?? [];
        this.loading = false;
        this.cdr.detectChanges(); // FIX: forcer le rendu après réponse HTTP
      },
      error: () => {
        this.plans = [];
        this.loading = false;
        this.cdr.detectChanges(); // FIX: forcer le rendu même en cas d'erreur
      }
    });
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return !!this.mySubscription
      && this.mySubscription.status === 'ACTIVE'
      && this.mySubscription.planId === plan.id;
  }

  get hasActiveSubscription(): boolean {
    return !!this.mySubscription && this.mySubscription.status === 'ACTIVE'
      && new Date(this.mySubscription.dateFin).getTime() > Date.now();
  }

  daysRemaining(): number {
    if (!this.mySubscription) return 0;
    const diff = new Date(this.mySubscription.dateFin).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /** Nombre d'offres/candidatures encore disponibles sur la période en cours (null tant que non chargé). */
  remainingQuota(): number | null {
    if (!this.mySubscription || this.quotaUsed === null) return null;
    return Math.max(0, this.mySubscription.quota - this.quotaUsed);
  }

  /** Durée totale (en jours) de l'abonnement en cours — sert de base au ring de progression. */
  private totalDaysForSubscription(): number {
    if (!this.mySubscription) return 0;
    const start = new Date(this.mySubscription.dateDebut).getTime();
    const end = new Date(this.mySubscription.dateFin).getTime();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }

  /** % de jours restants par rapport à la durée totale, pour le ring de progression du hero. */
  progressPercent(): number {
    const total = this.totalDaysForSubscription();
    if (!total) return 0;
    return Math.min(100, Math.max(0, (this.daysRemaining() / total) * 100));
  }

  /** CSS conic-gradient utilisé comme fond du ring de progression du hero. */
  ringBackground(): string {
    const pct = this.progressPercent();
    return `conic-gradient(#fff ${pct}%, rgba(255,255,255,.28) ${pct}% 100%)`;
  }

  /** % d'offres/candidatures restantes par rapport au quota total, pour le ring "offres restantes". */
  quotaProgressPercent(): number {
    const remaining = this.remainingQuota();
    if (!this.mySubscription || remaining === null || this.mySubscription.quota <= 0) return 0;
    return Math.min(100, Math.max(0, (remaining / this.mySubscription.quota) * 100));
  }

  /** CSS conic-gradient utilisé comme fond du ring "offres restantes" du hero. */
  quotaRingBackground(): string {
    const pct = this.quotaProgressPercent();
    return `conic-gradient(#fff ${pct}%, rgba(255,255,255,.28) ${pct}% 100%)`;
  }

  /** Libellé du bouton d'action selon le contexte (souscription initiale / renouvellement / changement). */
  ctaLabel(plan: SubscriptionPlan): string {
    if (!this.hasActiveSubscription) return 'Souscrire';
    if (this.isCurrentPlan(plan)) return 'Renouveler';
    return 'Changer pour cet abonnement';
  }

  // ── Paiement (simulation carte bancaire) ──────────────────────────────────
  /** Ouvre le modal de paiement pour un plan (au lieu de souscrire directement) */
  openPayment(plan: SubscriptionPlan) {
    if (this.paymentPlan) return;
    this.errorMsg = '';
    this.successMsg = '';
    this.paymentError = '';
    this.paymentErrors = {};
    this.paymentForm = { cardName: '', cardNumber: '', expiry: '', cvc: '' };
    this.paymentPlan = plan;
  }

  closePayment() {
    if (this.paying) return; // pas d'annulation pendant le traitement
    this.paymentPlan = null;
  }

  /** Détecte le réseau de la carte pour l'aperçu visuel (Visa/Mastercard/Amex/inconnu) */
  get cardBrand(): 'visa' | 'mastercard' | 'amex' | 'unknown' {
    const digits = this.paymentForm.cardNumber.replace(/\s/g, '');
    if (/^4/.test(digits)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    return 'unknown';
  }

  /** Formate en groupes de 4 chiffres au fil de la frappe (ex: 4242 4242 4242 4242) */
  onCardNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 16);
    this.paymentForm.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  /** Formate en MM/AA au fil de la frappe */
  onExpiryInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) digits = digits.slice(0, 2) + '/' + digits.slice(2);
    this.paymentForm.expiry = digits;
  }

  onCvcInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.paymentForm.cvc = input.value.replace(/\D/g, '').slice(0, 4);
  }

  /** Algorithme de Luhn — vérifie que le numéro de carte est structurellement valide */
  private isValidCardNumber(digits: string): boolean {
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (shouldDouble) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  private validatePaymentForm(): boolean {
    const errors: typeof this.paymentErrors = {};
    const digits = this.paymentForm.cardNumber.replace(/\s/g, '');

    if (!this.paymentForm.cardName.trim()) {
      errors.cardName = 'Nom du titulaire requis.';
    }

    if (this.STRICT_CARD_VALIDATION) {
      // Mode production : vraie vérification Luhn du numéro de carte.
      if (!this.isValidCardNumber(digits)) {
        errors.cardNumber = 'Numéro de carte invalide.';
      }
    } else {
      // Mode test : on exige juste une longueur plausible, sans vérifier Luhn,
      // pour pouvoir tester avec n'importe quel numéro fictif.
      if (digits.length < 13 || digits.length > 19) {
        errors.cardNumber = 'Numéro de carte invalide.';
      }
    }

    const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(this.paymentForm.expiry);
    if (!expiryMatch) {
      errors.expiry = 'Format MM/AA requis.';
    } else {
      const month = parseInt(expiryMatch[1], 10);
      const year = 2000 + parseInt(expiryMatch[2], 10);
      const now = new Date();
      const endOfExpiryMonth = new Date(year, month, 0, 23, 59, 59);
      if (month < 1 || month > 12) {
        errors.expiry = 'Mois invalide.';
      } else if (endOfExpiryMonth.getTime() < now.getTime()) {
        errors.expiry = 'Carte expirée.';
      }
    }

    const cvcLen = this.cardBrand === 'amex' ? 4 : 3;
    if (this.paymentForm.cvc.length !== cvcLen) {
      errors.cvc = `${cvcLen} chiffres requis.`;
    }

    this.paymentErrors = errors;
    return Object.keys(errors).length === 0;
  }

  /** Valide la carte, simule un traitement de paiement, puis active réellement l'abonnement */
  confirmPayment() {
    if (this.paying || !this.paymentPlan) return;
    this.paymentError = '';

    if (!this.validatePaymentForm()) return;

    this.paying = true;
    const plan = this.paymentPlan;

    // Simulation d'un aller-retour avec un serveur de paiement (aucune donnée de carte
    // n'est envoyée telle quelle : ceci est un flux fictif pour la démo, la vraie
    // activation se fait ensuite via l'API d'abonnement existante).
    setTimeout(() => {
      this.subscriptionService.subscribe(plan.id).subscribe({
        next: res => {
          this.mySubscription = res.data;
          this.quotaUsed = 0; // nouvelle période qui démarre : quota consommé repart à zéro
          this.paying = false;
          this.paymentPlan = null;
          this.redirectReason = '';
          this.successMsg = `Paiement accepté — abonnement "${plan.name}" activé avec succès !`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.paying = false;
          this.paymentError = err?.error?.message || "Le paiement a été refusé. Veuillez réessayer.";
          this.cdr.detectChanges();
        }
      });
    }, 1100);
  }
}