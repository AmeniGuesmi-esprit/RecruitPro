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
}