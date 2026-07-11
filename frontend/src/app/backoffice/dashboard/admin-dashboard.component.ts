import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { User } from '../../core/models/user.model';
import { Job } from '../../core/models/job.model';
import { UserSubscription } from '../../core/models/subscription.model';

const MONTH_LABELS_FR = ['Janv.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** Animation Apex commune, réutilisée sur tous les graphiques pour un rendu vivant à l'entrée */
const LIVELY_ANIMATIONS = {
  enabled: true,
  easing: 'easeinout' as const,
  speed: 750,
  animateGradually: { enabled: true, delay: 120 },
  dynamicAnimation: { enabled: true, speed: 350 }
};

/** Légère lueur (glow) commune pour donner du relief aux courbes/barres */
const LIVELY_DROPSHADOW = {
  enabled: true,
  top: 4,
  left: 0,
  blur: 6,
  opacity: 0.18
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
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

  totalRevenue = 0;
  totalSubscriptions = 0;
  activeSubscriptions = 0;

  recentUsers: User[] = [];

  // Courbe : offres créées par mois
  jobsByMonthChart: Partial<ApexOptions> = {};

  // Vue d'ensemble colorée : offres totales / actives / clôturées-archivées / candidatures
  jobsOverviewChart: Partial<ApexOptions> = {};

  // Répartition des utilisateurs par rôle
  usersByRoleChart: Partial<ApexOptions> = {};

  // Comptes créés par mois
  usersByMonthChart: Partial<ApexOptions> = {};

  // Revenus générés par mois (abonnements)
  revenueByMonthChart: Partial<ApexOptions> = {};

  // Nombre d'abonnements souscrits par mois
  subscriptionsByMonthChart: Partial<ApexOptions> = {};

  constructor(
    public auth: AuthService,
    private adminService: AdminService,
    private subscriptionService: SubscriptionService,
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
      applications: this.adminService.getApplicationsCount(),
      subscriptions: this.subscriptionService.getAllSubscriptionsAdmin()
    }).subscribe({
      next: ({ users, jobs, applications, subscriptions }) => {
        const allUsers: User[] = users.data ?? [];
        const allJobs: Job[] = jobs.data ?? [];
        const allSubscriptions: UserSubscription[] = subscriptions.data ?? [];

        this.totalUsers = allUsers.length;
        this.totalCompanies = allUsers.filter(u => u.role === 'COMPANY').length;
        this.totalCandidates = allUsers.filter(u => u.role === 'CANDIDATE').length;
        this.totalAdmins = allUsers.filter(u => u.role === 'ADMIN').length;

        this.totalJobs = allJobs.length;
        this.activeJobs = allJobs.filter(j => j.status === 'PUBLISHED').length;
        this.cloturedJobs = allJobs.filter(j => j.status === 'CLOTURE').length;
        this.archivedJobs = allJobs.filter(j => j.status === 'ARCHIVED').length;

        this.totalApplications = applications.data ?? 0;

        this.totalSubscriptions = allSubscriptions.length;
        this.activeSubscriptions = allSubscriptions.filter(s => s.status === 'ACTIVE').length;
        this.totalRevenue = allSubscriptions.reduce((sum, s) => sum + (s.montant ?? 0), 0);

        this.recentUsers = [...allUsers].sort((a, b) => b.id - a.id).slice(0, 5);

        this.buildJobsByMonthChart(allJobs);
        this.buildJobsOverviewChart();
        this.buildUsersByRoleChart();
        this.buildUsersByMonthChart(allUsers);
        this.buildRevenueByMonthChart(allSubscriptions);
        this.buildSubscriptionsByMonthChart(allSubscriptions);

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

  /** Additionne un montant par mois (clé "YYYY-MM") à partir d'une date et d'une valeur associée */
  private sumByMonth(buckets: Map<string, number>, entries: { date: string | undefined; value: number }[]): number[] {
    entries.forEach(({ date, value }) => {
      const created = date ? new Date(date) : null;
      if (!created || isNaN(created.getTime())) return;
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + (value ?? 0));
      }
    });
    return Array.from(buckets.values());
  }

  /** Construit le graphique coloré : offres totales / actives / clôturées-archivées / candidatures */
  private buildJobsOverviewChart(): void {
    const categories = ['Offres totales', 'Offres actives', 'Offres clôturées / archivées', 'Candidatures totales'];
    const data = [this.totalJobs, this.activeJobs, this.cloturedJobs + this.archivedJobs, this.totalApplications];
    const colors = ['#7C4DFF', '#2979FF', '#FF9100', '#FF4081'];

    this.jobsOverviewChart = {
      series: [{ name: 'Total', data }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        animations: LIVELY_ANIMATIONS,
        dropShadow: LIVELY_DROPSHADOW
      },
      plotOptions: {
        bar: {
          distributed: true,
          borderRadius: 8,
          columnWidth: '55%'
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.4,
          gradientToColors: ['#B388FF', '#82B1FF', '#FFD180', '#FF80AB'],
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.85,
          stops: [0, 100]
        }
      },
      colors,
      legend: { show: false },
      dataLabels: {
        enabled: true,
        style: { fontSize: '14px', fontWeight: 600, colors: ['#fff'] }
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
        type: 'area',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        animations: LIVELY_ANIMATIONS,
        dropShadow: LIVELY_DROPSHADOW
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          colorStops: [
            { offset: 0, color: '#2979FF', opacity: 0.55 },
            { offset: 50, color: '#7C4DFF', opacity: 0.25 },
            { offset: 100, color: '#7C4DFF', opacity: 0.02 }
          ]
        }
      },
      colors: ['#2979FF'],
      xaxis: {
        categories,
        labels: { rotate: -45 }
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (val: number) => Math.round(val).toString() }
      },
      markers: { size: 4, colors: ['#2979FF'], strokeColors: '#fff', strokeWidth: 2, hover: { size: 6 } },
      grid: { strokeDashArray: 4 },
      tooltip: { theme: 'light' }
    };
  }

  /** Construit le donut de répartition des utilisateurs par rôle (sociétés & candidats uniquement) */
  private buildUsersByRoleChart(): void {
    this.usersByRoleChart = {
      series: [this.totalCompanies, this.totalCandidates],
      chart: {
        type: 'donut',
        height: 320,
        background: 'transparent',
        animations: LIVELY_ANIMATIONS,
        dropShadow: LIVELY_DROPSHADOW
      },
      labels: ['Sociétés', 'Candidats'],
      colors: ['#7C4DFF', '#00E676'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'diagonal1',
          shadeIntensity: 0.5,
          gradientToColors: ['#448AFF', '#1DE9B6'],
          opacityFrom: 1,
          opacityTo: 0.9,
          stops: [0, 100]
        }
      },
      stroke: { width: 0 },
      legend: { position: 'bottom' },
      dataLabels: {
        enabled: true,
        style: { fontWeight: 600 },
        formatter: (val: number) => `${val.toFixed(0)}%`
      },
      plotOptions: {
        pie: {
          expandOnClick: true,
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Utilisateurs',
                formatter: () => (this.totalCompanies + this.totalCandidates).toString()
              }
            }
          }
        }
      },
      tooltip: { theme: 'light' }
    };
  }

  /** Construit l'histogramme des comptes créés par mois (12 derniers mois, sociétés & candidats uniquement) */
  private buildUsersByMonthChart(allUsers: User[]): void {
    const { buckets, categories } = this.buildLastMonthsBuckets(12);
    const nonAdminUsers = allUsers.filter(u => u.role !== 'ADMIN');
    const data = this.countByMonth(buckets, nonAdminUsers.map(u => u.createdAt));

    this.usersByMonthChart = {
      series: [{ name: 'Comptes créés', data }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        animations: LIVELY_ANIMATIONS,
        dropShadow: LIVELY_DROPSHADOW
      },
      dataLabels: { enabled: false },
      colors: ['#00C853'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.4,
          gradientToColors: ['#69F0AE'],
          opacityFrom: 1,
          opacityTo: 0.75,
          stops: [0, 100]
        }
      },
      plotOptions: {
        bar: { columnWidth: '45%', borderRadius: 6 }
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

  /** Construit la courbe des revenus générés par mois grâce aux abonnements (12 derniers mois) */
  private buildRevenueByMonthChart(allSubscriptions: UserSubscription[]): void {
    const { buckets, categories } = this.buildLastMonthsBuckets(12);
    const data = this.sumByMonth(
      buckets,
      allSubscriptions.map(s => ({ date: s.dateDebut, value: s.montant }))
    );

    this.revenueByMonthChart = {
      series: [{ name: 'Revenus', data }],
      chart: {
        type: 'area',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        animations: LIVELY_ANIMATIONS,
        dropShadow: LIVELY_DROPSHADOW
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          colorStops: [
            { offset: 0, color: '#00E676', opacity: 0.5 },
            { offset: 50, color: '#1DE9B6', opacity: 0.25 },
            { offset: 100, color: '#1DE9B6', opacity: 0.02 }
          ]
        }
      },
      colors: ['#00C853'],
      xaxis: {
        categories,
        labels: { rotate: -45 }
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (val: number) => `${Math.round(val)} DT` }
      },
      markers: { size: 4, colors: ['#00C853'], strokeColors: '#fff', strokeWidth: 2, hover: { size: 6 } },
      grid: { strokeDashArray: 4 },
      tooltip: { theme: 'light', y: { formatter: (val: number) => `${val} DT` } }
    };
  }

  /** Construit l'histogramme du nombre d'abonnements souscrits par mois (12 derniers mois) */
  private buildSubscriptionsByMonthChart(allSubscriptions: UserSubscription[]): void {
    const { buckets, categories } = this.buildLastMonthsBuckets(12);
    const data = this.countByMonth(buckets, allSubscriptions.map(s => s.dateDebut));

    this.subscriptionsByMonthChart = {
      series: [{ name: 'Abonnements souscrits', data }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        animations: LIVELY_ANIMATIONS,
        dropShadow: LIVELY_DROPSHADOW
      },
      dataLabels: { enabled: false },
      colors: ['#AA00FF'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.4,
          gradientToColors: ['#EA80FC'],
          opacityFrom: 1,
          opacityTo: 0.75,
          stops: [0, 100]
        }
      },
      plotOptions: {
        bar: { columnWidth: '45%', borderRadius: 6 }
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