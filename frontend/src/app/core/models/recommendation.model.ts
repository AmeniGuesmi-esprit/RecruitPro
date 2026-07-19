/** Miroir de JobRecommendationResponse (application-service). */
export interface JobRecommendation {
  jobId: number;
  title: string;
  description: string;
  skills: string[];
  salary: number;
  workSchedule: string;
  companyName: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  dateCloture: string;
  dateEntretien: string;

  /** Score de pertinence IA (0-100) de cette offre pour le CV du candidat connecté. */
  matchScore: number;
  /** Compétences du candidat retrouvées dans les compétences requises par l'offre. */
  matchedSkills: string[];
  /** Compétences requises par l'offre que le candidat ne possède pas (d'après son CV). */
  missingSkills: string[];
}
