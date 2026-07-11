import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { Job, JobStatus } from '../../core/models/job.model';
import { ApplicationResponse } from '../../core/models/application.model';

type PanelMode = 'detail' | 'candidates' | null;

@Component({
  selector: 'app-offers-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offers-list.component.html',
  styleUrl: './offers-list.component.scss'
})
export class OffersListComponent implements OnInit {
  loading = true;
  error: string | null = null;

  jobs: Job[] = [];
  filteredJobs: Job[] = [];

  search = '';
  statusFilter: JobStatus | 'ALL' = 'ALL';

  // Pagination : 2 lignes de 3 offres = 6 offres / page
  pageSize = 6;
  currentPage = 1;

  // Panneau latéral (détail de l'offre OU liste des candidats)
  selectedJob: Job | null = null;
  panelMode: PanelMode = null;

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
        this.applyFilters();
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

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filteredJobs = this.jobs.filter(j => {
      const matchesStatus = this.statusFilter === 'ALL' || j.status === this.statusFilter;
      const matchesSearch = !q ||
        j.title.toLowerCase().includes(q) ||
        j.companyName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  /** Bascule le filtre de statut : cliquer sur un statut déjà actif réaffiche toutes les offres */
  toggleStatusFilter(status: JobStatus): void {
    this.statusFilter = this.statusFilter === status ? 'ALL' : status;
    this.applyFilters();
  }

  /** Affiche toutes les offres, quel que soit leur statut */
  setStatusFilter(status: JobStatus | 'ALL'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  countByStatus(status: JobStatus): number {
    return this.jobs.filter(j => j.status === status).length;
  }

  get pagedJobs(): Job[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredJobs.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // ── Panneau latéral ──────────────────────────────────────────────────────

  /** Ouvre le détail de l'offre dans le panneau de droite */
  openDetail(job: Job): void {
    this.selectedJob = job;
    this.panelMode = 'detail';
  }

  /** Ouvre la liste des candidats de l'offre dans le panneau de droite */
  openCandidates(job: Job, event: Event): void {
    event.stopPropagation();
    this.selectedJob = job;
    this.panelMode = 'candidates';
    this.loadApplications(job);
  }

  /** Depuis le panneau détail, permet de basculer vers la liste des candidats */
  showCandidatesForSelected(): void {
    if (!this.selectedJob) return;
    this.panelMode = 'candidates';
    this.loadApplications(this.selectedJob);
  }

  showDetailForSelected(): void {
    this.panelMode = 'detail';
  }

  closePanel(): void {
    this.selectedJob = null;
    this.panelMode = null;
  }

  private loadApplications(job: Job): void {
    if (this.applicationsByJob[job.id]) return;
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

  statusLabel(status: JobStatus): string {
    switch (status) {
      case 'PUBLISHED': return 'Publiée';
      case 'CLOTURE': return 'Clôturée';
      case 'ARCHIVED': return 'Archivée';
      default: return status;
    }
  }

  statusIcon(status: JobStatus): string {
    switch (status) {
      case 'PUBLISHED': return 'ti-circle-check';
      case 'CLOTURE': return 'ti-lock';
      case 'ARCHIVED': return 'ti-archive';
      default: return 'ti-circle';
    }
  }

  applicationStatusLabel(status: ApplicationResponse['status']): string {
    switch (status) {
      case 'EN_COURS_DE_TRAITEMENT': return 'En cours';
      case 'ACCEPTEE_POUR_ENTRETIEN': return 'Acceptée';
      case 'REFUSEE': return 'Refusée';
      default: return status;
    }
  }
}