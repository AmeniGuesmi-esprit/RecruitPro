import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/user.model';
import { JobRecommendation } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly API = 'http://localhost:8222/api/applications/recommendations';

  constructor(private http: HttpClient) {}

  /**
   * Offres recommandées pour le candidat connecté, à partir de son CV
   * (calculées par recommendation-service, triées par score décroissant).
   */
  getRecommendations(limit: number = 10): Observable<ApiResponse<JobRecommendation[]>> {
    return this.http.get<ApiResponse<JobRecommendation[]>>(this.API, {
      params: { limit }
    });
  }
}
