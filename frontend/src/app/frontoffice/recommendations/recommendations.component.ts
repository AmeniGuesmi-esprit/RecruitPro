import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RecommendationService } from '../../core/services/recommendation.service';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';
import { JobRecommendation } from '../../core/models/recommendation.model';
import { ApplicationStatus } from '../../core/models/application.model';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.scss']
})
export class RecommendationsComponent implements OnInit {
  recommendations: JobRecommendation[] = [];
  selectedJob: JobRecommendation | null = null;

  /** true pendant le chargement initial (spinner plein écran) */
  loading = true;
  /** true si l'appel a échoué ou si recommendation-service est indisponible */
  errorState = false;

  // ── Candidature directement depuis la carte recommandée ──────────────────
  appliedJobIds = new Set<number>();
  applicationStatusByJobId = new Map<number, ApplicationStatus>();
  applyingJobIds = new Set<number>();
  applyErrorMsg = '';
  applyErrorJobId: number | null = null;
  confirmation: { title: string; message: string } | null = null;

  constructor(
    private recommendationService: RecommendationService,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.refreshCvStatusThenLoad();
  }

  /**
   * Le cache local (localStorage/AuthResponse) du cvPath n'est mis à jour
   * que par la page Profil, après un appel à getProfile(). Si l'utilisateur
   * arrive directement sur /recommendations (ex: CV ajouté lors d'une
   * session précédente, ou cvPath absent de la réponse de login), le cache
   * peut être périmé et faire croire à tort qu'il n'y a pas de CV.
   * On rafraîchit donc toujours le profil depuis le backend avant de décider
   * d'afficher le message "Complétez votre profil", au lieu de se fier
   * uniquement à la valeur en cache (comme le fait déjà ProfileComponent).
   */
  private refreshCvStatusThenLoad() {
    const current = this.authService.getCurrentUser();
    if (!current?.userId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.authService.getProfile(current.userId).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.authService.refreshUserInStorage({
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            cvPath: res.data.cvPath,
            imagePath: res.data.imagePath
          });
        }
        this.proceedAfterCvCheck();
      },
      error: () => {
        // Backend profil injoignable : on se rabat sur la valeur en cache
        // plutôt que de bloquer l'utilisateur avec une erreur bloquante ici.
        this.proceedAfterCvCheck();
      }
    });
  }

  private proceedAfterCvCheck() {
    if (!this.hasCv) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadRecommendations();

    this.applicationService.getMyApplications().subscribe({
      next: res => {
        const applications = res.data ?? [];
        this.appliedJobIds = new Set(applications.map(a => a.jobId));
        this.applicationStatusByJobId = new Map(applications.map(a => [a.jobId, a.status]));
        this.cdr.detectChanges();
      }
    });
  }

  /** Seuil minimum de pertinence pour qu'une offre soit affichée comme recommandée. */
  private readonly MIN_MATCH_SCORE = 70;

  private loadRecommendations() {
    this.loading = true;
    this.errorState = false;
    this.recommendationService.getRecommendations(50).subscribe({
      next: res => {
        const all = res.data ?? [];
        // On ne garde que les offres réellement pertinentes (> 70% de correspondance),
        // triées par score décroissant (déjà trié côté backend, on le garantit ici aussi).
        this.recommendations = all
          .filter(job => job.matchScore > this.MIN_MATCH_SCORE)
          .sort((a, b) => b.matchScore - a.matchScore);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorState = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  retry() {
    this.loadRecommendations();
  }

  get hasCv(): boolean {
    return !!this.authService.getCurrentUser()?.cvPath;
  }

  goToProfile() {
    this.router.navigate(['/frontoffice/profile']);
  }

  openDetail(job: JobRecommendation) { this.selectedJob = job; }
  closeDetail() { this.selectedJob = null; }

  /** Couleur du badge de score : vert si excellent match, orange si moyen, gris sinon. */
  scoreLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  // ── Candidature (mêmes règles que la page Offres) ─────────────────────────
  isApplied(job: JobRecommendation): boolean {
    return this.appliedJobIds.has(job.jobId);
  }

  isApplying(job: JobRecommendation): boolean {
    return this.applyingJobIds.has(job.jobId);
  }

  statusFor(job: JobRecommendation): ApplicationStatus {
    return this.applicationStatusByJobId.get(job.jobId) ?? 'EN_COURS_DE_TRAITEMENT';
  }

  statusLabel(status: ApplicationStatus): string {
    if (status === 'ACCEPTEE_POUR_ENTRETIEN') return 'Accepté pour entretien';
    if (status === 'REFUSEE') return 'Refusé';
    return 'En cours de traitement';
  }

  toggleApply(job: JobRecommendation, event?: Event) {
    event?.stopPropagation();
    if (this.isApplying(job)) return;

    this.applyingJobIds.add(job.jobId);
    this.cdr.detectChanges();

    if (this.isApplied(job)) {
      this.applicationService.cancel(job.jobId).subscribe({
        next: () => {
          this.appliedJobIds.delete(job.jobId);
          this.applicationStatusByJobId.delete(job.jobId);
          this.applyingJobIds.delete(job.jobId);
          this.confirmation = { title: 'Candidature annulée', message: 'Votre candidature a été annulée avec succès.' };
          this.selectedJob = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.applyingJobIds.delete(job.jobId);
          this.applyErrorMsg = "Impossible d'annuler la candidature. Veuillez réessayer.";
          this.applyErrorJobId = job.jobId;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    this.applicationService.apply(job.jobId).subscribe({
      next: (res) => {
        this.applyingJobIds.delete(job.jobId);

        if (res.success === false) {
          if (res.code === 'NO_SUBSCRIPTION' || res.code === 'QUOTA_EXCEEDED') {
            const reason = res.code === 'NO_SUBSCRIPTION' ? 'no-subscription' : 'quota-exceeded';
            this.router.navigate(['/frontoffice/abonnement'], { queryParams: { reason } });
            return;
          }
          this.applyErrorMsg = res.message || "Impossible d'envoyer la candidature. Veuillez réessayer.";
          this.applyErrorJobId = job.jobId;
          this.cdr.detectChanges();
          return;
        }

        this.appliedJobIds.add(job.jobId);
        this.applicationStatusByJobId.set(job.jobId, 'EN_COURS_DE_TRAITEMENT');
        this.confirmation = {
          title: 'Candidature envoyée !',
          message: 'Votre candidature a été envoyée avec succès. Nous vous contacterons pour vous communiquer le résultat.'
        };
        this.selectedJob = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.applyingJobIds.delete(job.jobId);
        if (err?.status === 402) {
          const reason = (err?.error?.message || '').includes('pas d\'abonnement') ? 'no-subscription' : 'quota-exceeded';
          this.router.navigate(['/frontoffice/abonnement'], { queryParams: { reason } });
          return;
        }
        this.applyErrorMsg = err?.error?.message || "Impossible d'envoyer la candidature. Veuillez réessayer.";
        this.applyErrorJobId = job.jobId;
        this.cdr.detectChanges();
      }
    });
  }

  closeConfirmation() {
    this.confirmation = null;
  }
}