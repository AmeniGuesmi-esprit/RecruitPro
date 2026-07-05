import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../core/models/user.model';
import { Job } from '../../core/models/job.model';

const MONTH_LABELS_FR = ['Janv.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  error: string | null = null;

  totalUsers = 0;
  totalCompanies = 0;
  totalCandidates = 0;
  totalAdmins = 0;

  totalJobs = 0;
  activeJobs = 0;
  cloturedJobs = 0;
  archivedJobs = 0;

  totalApplications = 0;

  recentUsers: User[] = [];

  // Courbe : offres créées par mois
  jobsByMonthChart: Partial<ApexOptions> = {};

  // Vue d'ensemble colorée : offres totales / actives / clôturées-archivées / candidatures
  jobsOverviewChart: Partial<ApexOptions> = {};

  // Répartition des utilisateurs par rôle
  usersByRoleChart: Partial<ApexOptions> = {};

  // Comptes créés par mois
  usersByMonthChart: Partial<ApexOptions> = {};

  constructor(
    public auth: AuthService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      users: this.adminService.getAllUsers(),
      jobs: this.adminService.getAllJobsAdmin(),
      applications: this.adminService.getApplicationsCount()
    }).subscribe({
      next: ({ users, jobs, applications }) => {
        const allUsers: User[] = users.data ?? [];
        const allJobs: Job[] = jobs.data ?? [];

        this.totalUsers = allUsers.length;
        this.totalCompanies = allUsers.filter(u => u.role === 'COMPANY').length;
        this.totalCandidates = allUsers.filter(u => u.role === 'CANDIDATE').length;
        this.totalAdmins = allUsers.filter(u => u.role === 'ADMIN').length;

        this.totalJobs = allJobs.length;
        this.activeJobs = allJobs.filter(j => j.status === 'PUBLISHED').length;
        this.cloturedJobs = allJobs.filter(j => j.status === 'CLOTURE').length;
        this.archivedJobs = allJobs.filter(j => j.status === 'ARCHIVED').length;

        this.totalApplications = applications.data ?? 0;

        this.recentUsers = [...allUsers].sort((a, b) => b.id - a.id).slice(0, 5);

        this.buildJobsByMonthChart(allJobs);
        this.buildJobsOverviewChart();
        this.buildUsersByRoleChart();
        this.buildUsersByMonthChart(allUsers);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger les statistiques de la plateforme.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /** Génère les buckets "YYYY-MM" -> 0 pour une fenêtre glissante de N mois, avec leurs libellés */
  private buildLastMonthsBuckets(months: number): { buckets: Map<string, number>; categories: string[] } {
    const now = new Date();
    const buckets = new Map<string, number>();
    const categories: string[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, 0);
      categories.push(`${MONTH_LABELS_FR[d.getMonth()]} ${d.getFullYear()}`);
    }

    return { buckets, categories };
  }

  /** Compte les éléments d'une liste par mois de création (clé "YYYY-MM") */
  private countByMonth(buckets: Map<string, number>, dates: (string | undefined)[]): number[] {
    dates.forEach(dateStr => {
      const created = dateStr ? new Date(dateStr) : null;
      if (!created || isNaN(created.getTime())) return;
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    });
    return Array.from(buckets.values());
  }

  /** Construit le graphique coloré : offres totales / actives / clôturées-archivées / candidatures */
  private buildJobsOverviewChart(): void {
    const categories = ['Offres totales', 'Offres actives', 'Offres clôturées / archivées', 'Candidatures totales'];
    const data = [this.totalJobs, this.activeJobs, this.cloturedJobs + this.archivedJobs, this.totalApplications];
    const colors = ['#ff9800', '#2196f3', '#607d8b', '#e91e63'];

    this.jobsOverviewChart = {
      series: [{ name: 'Total', data }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent'
      },
      plotOptions: {
        bar: {
          distributed: true,
          borderRadius: 6,
          columnWidth: '55%'
        }
      },
      colors,
      legend: { show: false },
      dataLabels: {
        enabled: true,
        style: { fontSize: '14px', fontWeight: 600 }
      },
      xaxis: {
        categories,
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (val: number) => Math.round(val).toString() }
      },
      grid: { strokeDashArray: 4 },
      tooltip: { theme: 'light' }
    };
  }

  /** Construit la courbe des offres créées par mois (12 derniers mois) */
  private buildJobsByMonthChart(allJobs: Job[]): void {
    const { buckets, categories } = this.buildLastMonthsBuckets(12);
    const data = this.countByMonth(buckets, allJobs.map(j => j.createdAt));

    this.jobsByMonthChart = {
      series: [{ name: 'Offres créées', data }],
      chart: {
        type: 'line',
        height: 320,
        toolbar: { show: false },
        background: 'transparent'
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#2196f3'],
      xaxis: {
        categories,
        labels: { rotate: -45 }
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (val: number) => Math.round(val).toString() }
      },
      markers: { size: 4 },
      grid: { strokeDashArray: 4 },
      tooltip: { theme: 'light' }
    };
  }

  /** Construit le donut de répartition des utilisateurs par rôle */
  private buildUsersByRoleChart(): void {
    this.usersByRoleChart = {
      series: [this.totalAdmins, this.totalCompanies, this.totalCandidates],
      chart: {
        type: 'donut',
        height: 320,
        background: 'transparent'
      },
      labels: ['Administrateurs', 'Sociétés', 'Candidats'],
      colors: ['#9c27b0', '#3f51b5', '#4caf50'],
      legend: { position: 'bottom' },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(0)}%`
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Utilisateurs',
                formatter: () => this.totalUsers.toString()
              }
            }
          }
        }
      },
      tooltip: { theme: 'light' }
    };
  }

  /** Construit l'histogramme des comptes créés par mois (12 derniers mois) */
  private buildUsersByMonthChart(allUsers: User[]): void {
    const { buckets, categories } = this.buildLastMonthsBuckets(12);
    const data = this.countByMonth(buckets, allUsers.map(u => u.createdAt));

    this.usersByMonthChart = {
      series: [{ name: 'Comptes créés', data }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent'
      },
      dataLabels: { enabled: false },
      colors: ['#4caf50'],
      plotOptions: {
        bar: { columnWidth: '45%', borderRadius: 4 }
      },
      xaxis: {
        categories,
        labels: { rotate: -45 }
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (val: number) => Math.round(val).toString() }
      },
      grid: { strokeDashArray: 4 },
      tooltip: { theme: 'light' }
    };
  }
}