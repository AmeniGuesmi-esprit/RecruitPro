import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/user.model';
import { ApplicationResponse, ApplicationStatus } from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly API = 'http://localhost:8222/api/applications';

  constructor(private http: HttpClient) {}

  /** Postuler à une offre (CANDIDATE) */
  apply(jobId: number): Observable<ApiResponse<ApplicationResponse>> {
    return this.http.post<ApiResponse<ApplicationResponse>>(this.API, { jobId });
  }

  /** Annuler sa candidature à une offre (CANDIDATE) */
  cancel(jobId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/job/${jobId}`);
  }

  /** Liste des jobId auxquels le candidat connecté a déjà postulé (CANDIDATE) */
  getMyAppliedJobIds(): Observable<ApiResponse<number[]>> {
    return this.http.get<ApiResponse<number[]>>(`${this.API}/mine`);
  }

  /** Liste complète (avec statut) des candidatures du candidat connecté (CANDIDATE) */
  getMyApplications(): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.API}/mine/details`);
  }

  /** Liste des candidats ayant postulé à une offre (COMPANY, propriétaire de l'offre) */
  getApplicationsForJob(jobId: number): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.API}/job/${jobId}`);
  }

  /** Changer le statut d'une candidature : accepter pour un entretien / refuser (COMPANY) */
  updateStatus(applicationId: number, status: ApplicationStatus): Observable<ApiResponse<ApplicationResponse>> {
    return this.http.patch<ApiResponse<ApplicationResponse>>(`${this.API}/${applicationId}/status`, { status });
  }

  /** Recalculer le score de matching d'une candidature (ex: si le score est resté indisponible) (COMPANY) */
  recomputeScore(applicationId: number): Observable<ApiResponse<ApplicationResponse>> {
    return this.http.patch<ApiResponse<ApplicationResponse>>(`${this.API}/${applicationId}/recompute-score`, {});
  }
}