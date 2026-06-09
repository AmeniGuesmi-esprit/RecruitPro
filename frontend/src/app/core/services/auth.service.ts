import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { ApiResponse, AuthResponse, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:8222/api/users';

  userSubject = new BehaviorSubject<AuthResponse | null>(this.loadUserFromStorage());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private loadUserFromStorage(): AuthResponse | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/auth/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data));
          this.userSubject.next(res.data);
        }
      })
    );
  }

  register(formData: FormData): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.API}/auth/register`, formData);
  }

  googleAuth(googleToken: string, role?: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/auth/google`, { googleToken, role }).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data));
          this.userSubject.next(res.data);
        }
      })
    );
  }

  verifyEmail(token: string): Observable<ApiResponse<void>> {
    return this.http.get<ApiResponse<void>>(`${this.API}/auth/verify-email`, { params: { token } });
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────────

  /** Étape 1 : soumet l'email → le backend envoie le lien par email */
  forgotPassword(email: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.API}/auth/forgot-password`, { email });
  }

  /** Étape 2 : soumet le token + nouveau mot de passe */
  resetPassword(token: string, newPassword: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.API}/auth/reset-password`, { token, newPassword });
  }

  // ── Profile ──────────────────────────────────────────────────────────────────

  getProfile(userId: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API}/${userId}`);
  }

  updateProfile(userId: number, formData: FormData): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API}/${userId}`, formData);
  }

  refreshUserInStorage(updatedFields: Partial<AuthResponse>): void {
    const current = this.getCurrentUser();
    if (current) {
      const updated = { ...current, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      this.userSubject.next(updated);
    }
  }

  deleteAccount(userId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/${userId}`);
  }

  logout(): void {
    localStorage.clear();
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return localStorage.getItem('token'); }
  getCurrentUser(): AuthResponse | null { return this.userSubject.getValue(); }
  isLoggedIn(): boolean { return !!this.getToken(); }
  getRole(): string | null { return this.getCurrentUser()?.role ?? null; }
}