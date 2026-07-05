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
  /** Statut de la candidature : EN_COURS_DE_TRAITEMENT (par défaut), ACCEPTEE_POUR_ENTRETIEN, REFUSEE */
  status: ApplicationStatus;
  appliedAt: string;
}