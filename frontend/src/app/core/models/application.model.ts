export type ApplicationStatus = 'EN_COURS_DE_TRAITEMENT' | 'ACCEPTEE_POUR_ENTRETIEN' | 'REFUSEE';

export interface ApplicationResponse {
  id: number;
  jobId: number;
  candidateId: number;
  candidateFirstName: string;
  candidateLastName: string;
  candidateEmail: string;
  /** URL complète et prête à l'emploi vers le CV */
  cvUrl?: string;
  /**
   * Pourcentage de correspondance (0-100) entre le CV du candidat et l'offre,
   * calculé par le microservice IA de matching au moment de la candidature.
   * undefined/null si non disponible (candidat sans CV, ou service de
   * matching indisponible au moment de la candidature).
   */
  matchScore?: number | null;
  /** Statut de la candidature : EN_COURS_DE_TRAITEMENT (par défaut), ACCEPTEE_POUR_ENTRETIEN, REFUSEE */
  status: ApplicationStatus;
  appliedAt: string;
}