import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, User } from '../models/user.model';
import { Job } from '../models/job.model';
import { ApplicationResponse } from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly USERS_API = 'http://localhost:8222/api/users';
  private readonly JOBS_API = 'http://localhost:8222/api/jobs';
  private readonly APPLICATIONS_API = 'http://localhost:8222/api/applications';

  constructor(private http: HttpClient) {}

  /** Tous les utilisateurs de la plateforme (ADMIN) */
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(this.USERS_API);
  }

  /** Toutes les offres, quel que soit le statut (ADMIN) */
  getAllJobsAdmin(): Observable<ApiResponse<Job[]>> {
    return this.http.get<ApiResponse<Job[]>>(`${this.JOBS_API}/admin/all`);
  }

  /** Toutes les candidatures reçues pour une offre, sans vérification de propriétaire (ADMIN) */
  getApplicationsForJobAdmin(jobId: number): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.APPLICATIONS_API}/admin/job/${jobId}`);
  }

  /** Nombre total de candidatures sur la plateforme (ADMIN) */
  getApplicationsCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.APPLICATIONS_API}/admin/count`);
  }
}
