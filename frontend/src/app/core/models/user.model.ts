export type Role = 'ADMIN' | 'COMPANY' | 'CANDIDATE';

export interface User {
  id: number;        // ✅ correspond au champ JSON retourné par le backend Java
  userId?: number;   // garde la compatibilité si utilisé ailleurs
  firstName: string; lastName: string;
  email: string; phone: string; role: Role;
  emailVerified: boolean; cvPath?: string; imagePath?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string; email: string; firstName: string;
  lastName: string; role: Role; userId: number;
  cvPath?: string; imagePath?: string;
}

export interface ApiResponse<T> {
  success: boolean; message: string; data: T;
  /** Code d'erreur métier optionnel (ex: 'NO_SUBSCRIPTION', 'QUOTA_EXCEEDED').
   *  Renvoyé avec un HTTP 200 pour certains cas métier, afin de ne pas dépendre
   *  d'un code HTTP d'erreur qui peut être altéré par la Gateway/un proxy. */
  code?: string;
}