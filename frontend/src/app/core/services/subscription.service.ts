import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/user.model';
import { PlanRequest, SubscriptionPlan, SubscriptionType, UserSubscription } from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly API = 'http://localhost:8222/api/subscriptions';

  constructor(private http: HttpClient) {}

  // ── COMPANY / CANDIDATE ────────────────────────────────────────────────────

  /** Plans actifs disponibles pour un type de compte donné (COMPANY ou CANDIDATE) */
  getPlansByType(type: SubscriptionType): Observable<ApiResponse<SubscriptionPlan[]>> {
    return this.http.get<ApiResponse<SubscriptionPlan[]>>(`${this.API}/plans/type/${type}`);
  }

  /** Mon abonnement actif (data = null si aucun) */
  getMySubscription(): Observable<ApiResponse<UserSubscription | null>> {
    return this.http.get<ApiResponse<UserSubscription | null>>(`${this.API}/me`);
  }

  /** Historique de mes abonnements (actifs et expirés) */
  getMyHistory(): Observable<ApiResponse<UserSubscription[]>> {
    return this.http.get<ApiResponse<UserSubscription[]>>(`${this.API}/me/history`);
  }

  /** Souscrire à un plan (ou en changer) — clôture automatiquement l'abonnement actif précédent */
  subscribe(planId: number): Observable<ApiResponse<UserSubscription>> {
    return this.http.post<ApiResponse<UserSubscription>>(`${this.API}/subscribe`, { planId });
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────

  /** Tous les plans, actifs et désactivés (ADMIN) */
  getAllPlans(): Observable<ApiResponse<SubscriptionPlan[]>> {
    return this.http.get<ApiResponse<SubscriptionPlan[]>>(`${this.API}/plans`);
  }

  /** Créer un plan d'abonnement (ADMIN) */
  createPlan(req: PlanRequest): Observable<ApiResponse<SubscriptionPlan>> {
    return this.http.post<ApiResponse<SubscriptionPlan>>(`${this.API}/plans`, req);
  }

  /** Modifier un plan d'abonnement (ADMIN) */
  updatePlan(id: number, req: PlanRequest): Observable<ApiResponse<SubscriptionPlan>> {
    return this.http.put<ApiResponse<SubscriptionPlan>>(`${this.API}/plans/${id}`, req);
  }

  /** Désactiver un plan d'abonnement (ADMIN) */
  deletePlan(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/plans/${id}`);
  }

  /** Toutes les souscriptions de tous les utilisateurs (ADMIN) */
  getAllSubscriptionsAdmin(): Observable<ApiResponse<UserSubscription[]>> {
    return this.http.get<ApiResponse<UserSubscription[]>>(`${this.API}/admin/all`);
  }
}
