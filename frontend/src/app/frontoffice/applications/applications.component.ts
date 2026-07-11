import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { Job } from '../../core/models/job.model';
import { ApplicationResponse, ApplicationStatus } from '../../core/models/application.model';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class ApplicationsComponent implements OnInit {
  loading = true;
  errorMsg = '';
  jobs: Job[] = [];

  /** Statut de la candidature, par jobId (ex: EN_COURS_DE_TRAITEMENT, ACCEPTEE_POUR_ENTRETIEN, REFUSEE) */
  applicationStatusByJobId = new Map<number, ApplicationStatus>();

  /** jobId en cours d'annulation (empêche le double-clic pendant l'appel HTTP) */
  cancelingJobIds = new Set<number>();
  cancelErrorMsg = '';

  /** Modal de confirmation affiché après une annulation réussie */
  confirmation: { title: string; message: string } | null = null;

  /** Offre actuellement affichée dans le modal de détail (style page Jobs) */
  selectedJob: Job | null = null;

  constructor(
    private applicationService: ApplicationService,
    private jobService: JobService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadApplications();
  }

  loadApplications() {
    this.loading = true;
    this.errorMsg = '';

    this.applicationService.getMyApplications().subscribe({
      next: res => {
        const applications: ApplicationResponse[] = res.data ?? [];
        this.applicationStatusByJobId = new Map(applications.map(a => [a.jobId, a.status]));

        if (applications.length === 0) {
          this.jobs = [];
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        // Récupère le détail de chaque offre postulée. On isole les erreurs
        // par offre (catchError -> null) pour qu'une offre introuvable ne
        // fasse pas échouer tout le chargement des autres.
        forkJoin(
          applications.map(a =>
            this.jobService.getJob(a.jobId).pipe(catchError(() => of(null)))
          )
        ).subscribe(results => {
          this.jobs = results
            .filter((r): r is { success: boolean; message: string; data: Job } => !!r?.data)
            .map(r => r.data);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.errorMsg = 'Impossible de charger vos candidatures. Veuillez réessayer.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isCanceling(job: Job): boolean {
    return this.cancelingJobIds.has(job.id);
  }

  statusFor(job: Job): ApplicationStatus {
    return this.applicationStatusByJobId.get(job.id) ?? 'EN_COURS_DE_TRAITEMENT';
  }

  statusLabel(status: ApplicationStatus): string {
    if (status === 'ACCEPTEE_POUR_ENTRETIEN') return 'Accepté pour entretien';
    if (status === 'REFUSEE') return 'Refusé';
    return 'En cours de traitement';
  }

  cancelApplication(job: Job) {
    if (this.isCanceling(job)) return;
    this.cancelErrorMsg = '';

    this.cancelingJobIds.add(job.id);
    this.cdr.detectChanges();

    this.applicationService.cancel(job.id).subscribe({
      next: () => {
        this.jobs = this.jobs.filter(j => j.id !== job.id);
        this.applicationStatusByJobId.delete(job.id);
        this.cancelingJobIds.delete(job.id);
        this.confirmation = {
          title: 'Candidature annulée',
          message: 'Votre candidature a été annulée avec succès.'
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.cancelingJobIds.delete(job.id);
        this.cancelErrorMsg = 'Impossible d\'annuler cette candidature. Veuillez réessayer.';
        this.cdr.detectChanges();
      }
    });
  }

  closeConfirmation() {
    this.confirmation = null;
  }

  // ── Modal de détail (même comportement que la page Jobs) ─────────────────
  openDetail(job: Job) { this.selectedJob = job; }
  closeDetail()        { this.selectedJob = null; }

  // ── Statut de l'offre (badge PUBLIÉE / CLÔTURÉE, même logique que Jobs) ──
  isCloture(job: Job): boolean {
    return job.status !== 'PUBLISHED';
  }

  jobStatusLabel(job: Job): string {
    return this.isCloture(job) ? 'CLÔTURÉE' : 'PUBLIÉE';
  }

  jobStatusIcon(job: Job): string {
    return this.isCloture(job) ? 'ti-calendar-off' : 'ti-check';
  }

  // ── Stats (box façon page Abonnement) ─────────────────────────────────────
  get totalCount(): number {
    return this.jobs.length;
  }

  get accepteeCount(): number {
    return this.jobs.filter(j => this.statusFor(j) === 'ACCEPTEE_POUR_ENTRETIEN').length;
  }

  get refuseeCount(): number {
    return this.jobs.filter(j => this.statusFor(j) === 'REFUSEE').length;
  }

  get enCoursCount(): number {
    return this.jobs.filter(j => this.statusFor(j) === 'EN_COURS_DE_TRAITEMENT').length;
  }

  private ratioPercent(count: number): number {
    if (this.totalCount === 0) return 0;
    return Math.min(100, Math.max(0, (count / this.totalCount) * 100));
  }

  accepteeRingBackground(): string {
    const pct = this.ratioPercent(this.accepteeCount);
    return `conic-gradient(#fff ${pct}%, rgba(255,255,255,.28) ${pct}% 100%)`;
  }

  refuseeRingBackground(): string {
    const pct = this.ratioPercent(this.refuseeCount);
    return `conic-gradient(#fff ${pct}%, rgba(255,255,255,.28) ${pct}% 100%)`;
  }
}