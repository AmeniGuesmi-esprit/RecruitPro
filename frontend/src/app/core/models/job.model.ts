export type JobStatus = 'PUBLISHED' | 'CLOTURE' | 'ARCHIVED';

export interface Job {
  id: number;
  title: string;
  description: string;
  skills: string[];
  salary: number;
  workSchedule: string;
  companyName: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  recruiterId: number;
  status: JobStatus;
  dateDebut: string;
  dateCloture: string;
  /** Date de l'entretien : doit être postérieure à la date de clôture */
  dateEntretien: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRequest {
  title: string;
  description: string;
  skills: string[];
  salary: number;
  workSchedule: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  /** Doit être une date/heure postérieure au moment de l'envoi */
  dateCloture: string;
  /** Doit être une date/heure postérieure à dateCloture */
  dateEntretien: string;
}