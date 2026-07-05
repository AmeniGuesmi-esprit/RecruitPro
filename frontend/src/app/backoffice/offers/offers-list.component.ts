import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { Job, JobStatus } from '../../core/models/job.model';
import { ApplicationResponse } from '../../core/models/application.model';

@Component({
  selector: 'app-offers-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offers-list.component.html'
})
export class OffersListComponent implements OnInit {
  loading = true;
  error: string | null = null;

  jobs: Job[] = [];

  /** jobId développé actuellement (accordéon) */
  expandedJobId: number | null = null;

  /** cache des candidatures déjà chargées par offre */
  applicationsByJob: Record<number, ApplicationResponse[]> = {};
  applicationsLoading: Record<number, boolean> = {};

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.error = null;
    this.adminService.getAllJobsAdmin().subscribe({
      next: (res) => {
        this.jobs = (res.data ?? []).sort((a, b) => b.id - a.id);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger la liste des offres.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleJob(job: Job): void {
    if (this.expandedJobId === job.id) {
      this.expandedJobId = null;
      return;
    }
    this.expandedJobId = job.id;
    if (!this.applicationsByJob[job.id]) {
      this.applicationsLoading[job.id] = true;
      this.adminService.getApplicationsForJobAdmin(job.id).subscribe({
        next: (res) => {
          this.applicationsByJob[job.id] = res.data ?? [];
          this.applicationsLoading[job.id] = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.applicationsByJob[job.id] = [];
          this.applicationsLoading[job.id] = false;
          this.cdr.detectChanges();
        }
      });
    }
    this.cdr.detectChanges();
  }

  statusLabel(status: JobStatus): string {
    switch (status) {
      case 'PUBLISHED': return 'Publiée';
      case 'CLOTURE': return 'Clôturée';
      case 'ARCHIVED': return 'Archivée';
      default: return status;
    }
  }
}