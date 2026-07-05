import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/user.model';
import { Job, JobRequest } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly API = 'http://localhost:8222/api/jobs';

  constructor(private http: HttpClient) {}

  /** Toutes les offres publiées (public) */
  getAllJobs(): Observable<ApiResponse<Job[]>> {
    return this.http.get<ApiResponse<Job[]>>(this.API);
  }

  /**
   * Recherche/filtre en temps réel (public) — le parsing (salaire, régime,
   * texte libre) est fait côté backend, voir JobSpecifications.java.
   */
  searchJobs(query: string): Observable<ApiResponse<Job[]>> {
    return this.http.get<ApiResponse<Job[]>>(this.API + '/search', {
      params: { q: query ?? '' },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  /** Détail d'une offre (public) */
  getJob(id: number): Observable<ApiResponse<Job>> {
    return this.http.get<ApiResponse<Job>>(`${this.API}/${id}`);
  }

  /** Mes offres, tous statuts confondus (COMPANY) */
  getMyJobs(): Observable<ApiResponse<Job[]>> {
    return this.http.get<ApiResponse<Job[]>>(`${this.API}/my`);
  }

  /** Créer une offre avec logo (COMPANY) */
  createJob(req: JobRequest, logo?: File): Observable<ApiResponse<Job>> {
    const form = new FormData();
    form.append('job', new Blob([JSON.stringify(req)], { type: 'application/json' }));
    if (logo) form.append('logo', logo);
    return this.http.post<ApiResponse<Job>>(this.API, form);
  }

  /** Modifier une offre (COMPANY) */
  updateJob(id: number, req: JobRequest, logo?: File): Observable<ApiResponse<Job>> {
    const form = new FormData();
    form.append('job', new Blob([JSON.stringify(req)], { type: 'application/json' }));
    if (logo) form.append('logo', logo);
    return this.http.put<ApiResponse<Job>>(`${this.API}/${id}`, form);
  }

  /** Archiver une offre — remplace l'ancienne suppression (COMPANY) */
  archiveJob(id: number): Observable<ApiResponse<Job>> {
    return this.http.patch<ApiResponse<Job>>(`${this.API}/${id}/archive`, {});
  }
}