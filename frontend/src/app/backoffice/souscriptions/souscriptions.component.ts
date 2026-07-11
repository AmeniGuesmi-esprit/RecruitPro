import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SubscriptionType, UserSubscription } from '../../core/models/subscription.model';

type SubStatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED';

@Component({
  selector: 'app-souscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './souscriptions.component.html',
  styleUrls: ['./souscriptions.component.scss']
})
export class SouscriptionsComponent implements OnInit {

  subscriptions: UserSubscription[] = [];
  loadingSubs = true;
  errorSubs: string | null = null;
  subStatusFilter: SubStatusFilter = 'ALL';

  constructor(
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  loadSubscriptions(): void {
    this.loadingSubs = true;
    this.errorSubs = null;
    this.subscriptionService.getAllSubscriptionsAdmin().subscribe({
      next: (res) => {
        this.subscriptions = (res.data ?? []).sort((a, b) => b.id - a.id);
        this.loadingSubs = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorSubs = 'Impossible de charger les souscriptions.';
        this.loadingSubs = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Filtre par statut de souscription (Tous / Actif / Expiré) ────────────
  setSubStatusFilter(status: SubStatusFilter): void {
    this.subStatusFilter = status;
  }

  get filteredSubscriptions(): UserSubscription[] {
    if (this.subStatusFilter === 'ALL') return this.subscriptions;
    return this.subscriptions.filter(s =>
      this.subStatusFilter === 'ACTIVE' ? this.isSubActive(s) : !this.isSubActive(s)
    );
  }

  get activeSubsCount(): number {
    return this.subscriptions.filter(s => this.isSubActive(s)).length;
  }

  get expiredSubsCount(): number {
    return this.subscriptions.filter(s => !this.isSubActive(s)).length;
  }

  get totalSubsCount(): number {
    return this.subscriptions.length;
  }

  isSubActive(sub: UserSubscription): boolean {
    return sub.status === 'ACTIVE';
  }

  typeLabel(type: SubscriptionType): string {
    return type === 'COMPANY' ? 'Société' : 'Candidat';
  }

  typeIcon(type: SubscriptionType): string {
    return type === 'COMPANY' ? 'ti-building' : 'ti-user';
  }

  quotaUnitLabel(type: SubscriptionType): string {
    return type === 'COMPANY' ? 'offres' : 'candidatures';
  }
}
