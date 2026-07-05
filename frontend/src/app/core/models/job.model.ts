export type JobStatus = 'PUBLISHED' | 'ARCHIVED';

export interface Job {
  id: number;
  title: string;
  description: string;
  skills: string[];
  salaryMin: number;
  salaryMax: number;
  workSchedule: string;
  companyName: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  recruiterId: number;
  status: JobStatus;
  dateDebut: string;
  dateCloture: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRequest {
  title: string;
  description: string;
  skills: string[];
  salaryMin: number;
  salaryMax: number;
  workSchedule: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  /** Doit être une date/heure postérieure au moment de l'envoi */
  dateCloture: string;
}