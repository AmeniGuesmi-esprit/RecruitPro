export type SubscriptionType = 'COMPANY' | 'CANDIDATE';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED';

export interface SubscriptionPlan {
  id: number;
  name: string;
  type: SubscriptionType;
  montant: number;
  /** Nombre d'offres autorisées (COMPANY) ou nombre de candidatures autorisées (CANDIDATE) */
  quota: number;
  dureeJours: number;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanRequest {
  name: string;
  type: SubscriptionType;
  montant: number;
  quota: number;
  dureeJours: number;
  description?: string;
}

export interface UserSubscription {
  id: number;
  userId: number;
  type: SubscriptionType;
  planId: number;
  planName: string;
  montant: number;
  quota: number;
  dateDebut: string;
  dateFin: string;
  status: SubscriptionStatus;
}
