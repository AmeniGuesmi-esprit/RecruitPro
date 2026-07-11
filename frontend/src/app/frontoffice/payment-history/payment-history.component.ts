import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionType, UserSubscription } from '../../core/models/subscription.model';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {

  // En mode zoneless (voir main.ts), Angular ne détecte les changements
  // effectués dans un callback async (subscribe, setTimeout, ...) que s'ils
  // passent par un signal. De simples propriétés (loading = false) ne
  // déclenchent plus de rafraîchissement automatique de la vue.
  loading = signal(true);
  errorMsg = signal('');
  history = signal<UserSubscription[]>([]);

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.subscriptionService.getMyHistory().subscribe({
      next: res => {
        // Tri du plus récent au plus ancien (par date de début)
        const sorted = (res.data ?? []).slice().sort(
          (a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()
        );
        this.history.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set("Impossible de charger l'historique de paiement pour le moment.");
        this.loading.set(false);
      }
    });
  }

  get accountType(): SubscriptionType | null {
    const role = this.authService.getRole();
    if (role === 'COMPANY') return 'COMPANY';
    if (role === 'CANDIDATE') return 'CANDIDATE';
    return null;
  }

  get quotaLabel(): string {
    return this.accountType === 'COMPANY' ? "offres d'emploi" : 'candidatures';
  }

  /** Un abonnement est "actif" tant que son statut l'indique ET que sa date de fin n'est pas dépassée. */
  isActive(sub: UserSubscription): boolean {
    return sub.status === 'ACTIVE' && new Date(sub.dateFin).getTime() > Date.now();
  }

  /** Total dépensé sur tout l'historique (somme des montants). */
  get totalSpent(): number {
    return this.history().reduce((sum, s) => sum + (s.montant ?? 0), 0);
  }

  get totalTransactions(): number {
    return this.history().length;
  }
}