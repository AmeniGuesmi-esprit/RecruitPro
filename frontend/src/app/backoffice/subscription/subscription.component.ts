import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../core/services/subscription.service';
import { PlanRequest, SubscriptionPlan, SubscriptionType } from '../../core/models/subscription.model';

type PlanTypeFilter = 'ALL' | 'COMPANY' | 'CANDIDATE';
type PlanStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {

  // ── Plans ──────────────────────────────────────────────────────────────
  plans: SubscriptionPlan[] = [];
  loadingPlans = true;
  errorPlans: string | null = null;
  planTypeFilter: PlanTypeFilter = 'ALL';
  planStatusFilter: PlanStatusFilter = 'ALL';

  showForm = false;
  editingPlan: SubscriptionPlan | null = null;
  form: PlanRequest = this.emptyForm();
  savingPlan = false;
  formError: string | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  // ── Chargement ─────────────────────────────────────────────────────────
  loadPlans(): void {
    this.loadingPlans = true;
    this.errorPlans = null;
    this.subscriptionService.getAllPlans().subscribe({
      next: (res) => {
        this.plans = (res.data ?? []).sort((a, b) => b.id - a.id);
        this.loadingPlans = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorPlans = 'Impossible de charger les plans d\'abonnement.';
        this.loadingPlans = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Filtre par type de plan (Tous / Company / Candidat) ──────────────────
  setPlanTypeFilter(type: PlanTypeFilter): void {
    this.planTypeFilter = type;
  }

  // ── Filtre par statut de plan (Tous / Actif / Désactivé) ─────────────────
  setPlanStatusFilter(status: PlanStatusFilter): void {
    this.planStatusFilter = status;
  }

  get filteredPlans(): SubscriptionPlan[] {
    return this.plans.filter(p => {
      const matchesType = this.planTypeFilter === 'ALL' || p.type === this.planTypeFilter;
      const matchesStatus =
        this.planStatusFilter === 'ALL' ||
        (this.planStatusFilter === 'ACTIVE' ? p.active : !p.active);
      return matchesType && matchesStatus;
    });
  }

  get companyPlansCount(): number {
    return this.plans.filter(p => p.type === 'COMPANY').length;
  }

  get candidatePlansCount(): number {
    return this.plans.filter(p => p.type === 'CANDIDATE').length;
  }

  get activePlansCount(): number {
    return this.plans.filter(p => p.active).length;
  }

  get inactivePlansCount(): number {
    return this.plans.filter(p => !p.active).length;
  }

  // ── Formulaire plan ────────────────────────────────────────────────────
  private emptyForm(): PlanRequest {
    return { name: '', type: 'COMPANY', montant: 0, quota: 1, dureeJours: 30, description: '' };
  }

  openCreateForm(): void {
    this.editingPlan = null;
    this.form = this.emptyForm();
    this.formError = null;
    this.showForm = true;
  }

  openEditForm(plan: SubscriptionPlan): void {
    this.editingPlan = plan;
    this.form = {
      name: plan.name,
      type: plan.type,
      montant: plan.montant,
      quota: plan.quota,
      dureeJours: plan.dureeJours,
      description: plan.description ?? ''
    };
    this.formError = null;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingPlan = null;
    this.formError = null;
  }

  get quotaLabel(): string {
    return this.form.type === 'COMPANY' ? "Nombre d'offres autorisées" : 'Nombre de candidatures autorisées';
  }

  savePlan(): void {
    this.formError = null;

    if (!this.form.name?.trim()) { this.formError = 'Le nom est obligatoire.'; return; }
    if (this.form.montant == null || this.form.montant < 0) { this.formError = 'Le montant doit être positif ou nul.'; return; }
    if (!this.form.quota || this.form.quota <= 0) { this.formError = 'Le quota doit être supérieur à 0.'; return; }
    if (!this.form.dureeJours || this.form.dureeJours <= 0) { this.formError = 'La durée doit être supérieure à 0.'; return; }

    this.savingPlan = true;
    const req$ = this.editingPlan
      ? this.subscriptionService.updatePlan(this.editingPlan.id, this.form)
      : this.subscriptionService.createPlan(this.form);

    req$.subscribe({
      next: () => {
        this.savingPlan = false;
        this.closeForm();
        this.loadPlans();
      },
      error: (err) => {
        this.savingPlan = false;
        this.formError = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.cdr.detectChanges();
      }
    });
  }

  deactivatePlan(plan: SubscriptionPlan): void {
    if (!confirm(`Désactiver le plan "${plan.name}" ? Il ne sera plus proposé aux utilisateurs.`)) return;
    this.subscriptionService.deletePlan(plan.id).subscribe({
      next: () => this.loadPlans(),
      error: () => {
        this.errorPlans = 'Impossible de désactiver ce plan.';
        this.cdr.detectChanges();
      }
    });
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