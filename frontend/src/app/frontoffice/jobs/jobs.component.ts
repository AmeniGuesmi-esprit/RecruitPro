import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/services/auth.service';
import { Job } from '../../core/models/job.model';
import { ApplicationStatus } from '../../core/models/application.model';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss']
})
export class JobsComponent implements OnInit, OnDestroy {
  filteredJobs: Job[] = [];
  /** Nombre total d'offres actives (sans filtre) — utilisé pour "sur X au total" et les états vides. */
  totalCount = 0;

  /** Chargement INITIAL de la page uniquement (affiche le spinner plein écran, cache la barre). */
  loading = true;
  /** Recherche en cours (déclenchée par la frappe) — ne cache JAMAIS la barre de recherche,
   *  sinon l'input est détruit/recréé à chaque lettre et perd le focus. */
  searching = false;

  selectedJob: Job | null = null;

  // ── Candidature (CANDIDATE) ───────────────────────────────────────────────
  /** jobId des offres auxquelles le candidat connecté a déjà postulé */
  appliedJobIds = new Set<number>();
  /** Statut de la candidature, par jobId (ex: EN_COURS_DE_TRAITEMENT, ACCEPTEE_POUR_ENTRETIEN, REFUSEE) */
  applicationStatusByJobId = new Map<number, ApplicationStatus>();
  /** jobId en cours de traitement (empêche le double-clic pendant l'appel HTTP) */
  applyingJobIds = new Set<number>();
  applyErrorMsg = '';
  /** jobId concerné par applyErrorMsg (pour afficher l'erreur sur la bonne carte / modal) */
  applyErrorJobId: number | null = null;

  /** Modal de confirmation affiché après un Postuler / Annuler réussi */
  confirmation: { title: string; message: string } | null = null;

  // ── Barre de recherche unifiée ───────────────────────────────────────────
  searchQuery = '';

  // ── Filtres "cosmétiques" : uniquement pour l'affichage des badges et les
  //    suggestions. Le VRAI filtrage se fait maintenant côté backend
  //    (job-service, voir JobSpecifications.java) via JobService.searchJobs().
  parsedCompany   = '';
  parsedSchedule  = '';
  parsedMinSalary: number | null = null;
  parsedSkills: string[] = [];

  // ── Suggestions autocomplete ──────────────────────────────────────────────
  /** true tant que l'input a le focus : contrôle SEUL l'affichage du dropdown
   *  (la liste "suggestions" peut être vide sans que le dropdown se ferme). */
  searchFocused = false;
  suggestions: string[] = [];

  // Compétences déjà vues (alimente l'autocomplete au fil des résultats reçus)
  private knownSkills = new Set<string>();

  readonly scheduleOptions = ['CDI', 'CDD', 'Temps partiel', 'Freelance', 'Stage', 'Alternance'];

  // ── Flux de recherche temps réel : debounce + switchMap pour annuler
  //    automatiquement une requête HTTP encore en vol si une nouvelle frappe
  //    arrive avant la réponse (évite qu'une réponse "en retard" écrase un
  //    résultat plus récent).
  private search$ = new Subject<string>();

  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.jobService.searchJobs(query))
    ).subscribe({
      next: res => this.onSearchResult(res.data ?? [], this.searchQuery),
      error: () => {
        this.loading = false;
        this.searching = false;
        this.cdr.detectChanges();
      }
    });

    // Chargement initial : équivalent à une recherche vide (toutes les offres actives)
    this.loading = true;
    this.jobService.searchJobs('').subscribe({
      next: res => this.onSearchResult(res.data ?? [], ''),
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    // Charger les candidatures déjà envoyées, pour afficher "Annuler" au lieu de "Postuler"
    if (this.isCandidate) {
      this.applicationService.getMyApplications().subscribe({
        next: res => {
          const applications = res.data ?? [];
          this.appliedJobIds = new Set(applications.map(a => a.jobId));
          this.applicationStatusByJobId = new Map(applications.map(a => [a.jobId, a.status]));
          this.cdr.detectChanges();
        }
      });
    }
  }

  ngOnDestroy() {
    this.search$.complete();
  }

  private onSearchResult(jobs: Job[], query: string) {
    this.filteredJobs = jobs;
    this.filteredJobs.forEach(j => j.skills.forEach(s => this.knownSkills.add(s)));
    if (!query.trim()) {
      // Requête vide = toutes les offres actives → sert de référence pour le total
      this.totalCount = this.filteredJobs.length;
    }
    this.loading = false;
    this.searching = false;
    this.updateSuggestions();
    this.cdr.detectChanges();
  }

  openDetail(job: Job)  { this.selectedJob = job; }
  closeDetail()         { this.selectedJob = null; }

  // ── Candidature (CANDIDATE) ───────────────────────────────────────────────

  get isCandidate(): boolean {
    return this.authService.isLoggedIn() && this.authService.getRole() === 'CANDIDATE';
  }

  isApplied(job: Job): boolean {
    return this.appliedJobIds.has(job.id);
  }

  statusFor(job: Job): ApplicationStatus {
    return this.applicationStatusByJobId.get(job.id) ?? 'EN_COURS_DE_TRAITEMENT';
  }

  statusLabel(status: ApplicationStatus): string {
    if (status === 'ACCEPTEE_POUR_ENTRETIEN') return 'Accepté pour entretien';
    if (status === 'REFUSEE') return 'Refusé';
    return 'En cours de traitement';
  }

  isApplying(job: Job): boolean {
    return this.applyingJobIds.has(job.id);
  }

  /** L'offre accepte encore les candidatures (bouton actif) uniquement si PUBLIÉE */
  canApply(job: Job): boolean {
    return job.status === 'PUBLISHED';
  }

  /** Postuler / Annuler selon l'état courant. Empêche l'ouverture du modal (stopPropagation côté template). */
  toggleApply(job: Job) {
    if (!this.canApply(job) || this.isApplying(job)) return;
    this.applyErrorMsg = '';
    this.applyErrorJobId = null;

    this.applyingJobIds.add(job.id);
    this.cdr.detectChanges();

    if (this.isApplied(job)) {
      this.applicationService.cancel(job.id).subscribe({
        next: () => {
          this.appliedJobIds.delete(job.id);
          this.applicationStatusByJobId.delete(job.id);
          this.applyingJobIds.delete(job.id);
          this.confirmation = {
            title: 'Candidature annulée',
            message: 'Votre candidature a été annulée avec succès.'
          };
          this.selectedJob = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.applyingJobIds.delete(job.id);
          this.applyErrorMsg = 'Impossible d\'annuler la candidature. Veuillez réessayer.';
          this.applyErrorJobId = job.id;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.applicationService.apply(job.id).subscribe({
        next: () => {
          this.appliedJobIds.add(job.id);
          this.applicationStatusByJobId.set(job.id, 'EN_COURS_DE_TRAITEMENT');
          this.applyingJobIds.delete(job.id);
          this.confirmation = {
            title: 'Candidature envoyée !',
            message: 'Votre candidature a été envoyée avec succès. Nous vous contacterons pour vous communiquer le résultat.'
          };
          this.selectedJob = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.applyingJobIds.delete(job.id);
          this.applyErrorMsg = err?.error?.message || 'Impossible d\'envoyer la candidature. Veuillez réessayer.';
          this.applyErrorJobId = job.id;
          this.cdr.detectChanges();
        }
      });
    }
  }

  closeConfirmation() {
    this.confirmation = null;
  }

  // ── Compétences disponibles pour autocomplete ────────────────────────────
  get availableSkills(): string[] {
    return Array.from(this.knownSkills).sort((a, b) => a.localeCompare(b));
  }

  // ── Parsing "cosmétique" de la barre de recherche ─────────────────────────
  /**
   * Ne filtre plus rien lui-même : sert uniquement à afficher les badges de
   * filtres actifs et à générer les suggestions d'autocomplete pendant que
   * l'utilisateur tape. Le texte brut de la recherche est envoyé tel quel au
   * backend (JobService.searchJobs), qui fait le vrai parsing/filtrage.
   */
  parseQuery(query: string) {
    const tokens = query.trim().split(/\s+/).filter(t => t.length > 0);

    this.parsedSchedule  = '';
    this.parsedMinSalary = null;
    this.parsedCompany   = '';
    this.parsedSkills    = [];

    const remainingTokens: string[] = [];

    for (const token of tokens) {
      // Token numérique → salaire minimum
      const num = parseFloat(token);
      if (!isNaN(num) && /^\d+$/.test(token)) {
        this.parsedMinSalary = num;
        continue;
      }

      // Token correspondant à un régime horaire (insensible à la casse)
      const matchedSchedule = this.scheduleOptions.find(
        s => s.toLowerCase() === token.toLowerCase()
      );
      if (matchedSchedule) {
        this.parsedSchedule = matchedSchedule;
        continue;
      }

      remainingTokens.push(token);
    }

    this.parsedCompany = remainingTokens.join(' ');
    this.parsedSkills  = remainingTokens;
  }

  // ── Recherche en temps réel ────────────────────────────────────────────────
  onSearchInput() {
    this.parseQuery(this.searchQuery);
    this.updateSuggestions();
    this.searching = true; // n'affecte plus l'affichage de la barre (voir template)
    this.search$.next(this.searchQuery); // déclenche la recherche backend (debounced 300ms)
  }

  // ── Suggestions dynamiques ────────────────────────────────────────────────
  // NB : cette méthode ne fait plus JAMAIS fermer le dropdown elle-même.
  // Le dropdown reste ouvert tant que `searchFocused` est true et que la
  // requête n'est pas vide — seule la LISTE affichée dedans change pendant
  // la frappe (elle peut être vide, auquel cas le template affiche un message
  // "aucune suggestion" au lieu de faire disparaître tout le bloc).
  updateSuggestions() {
    const query = this.searchQuery.trim();
    if (!query) {
      this.suggestions = [];
      return;
    }

    const lastWord = query.split(/\s+/).pop()?.toLowerCase() ?? '';
    if (!lastWord) {
      this.suggestions = [];
      return;
    }

    const skillSuggestions = this.availableSkills
      .filter(s => s.toLowerCase().includes(lastWord) &&
        !this.parsedSkills.some(ps => ps.toLowerCase() === s.toLowerCase()))
      .slice(0, 5);

    const scheduleSuggestions = this.scheduleOptions
      .filter(s => s.toLowerCase().includes(lastWord) && s !== this.parsedSchedule)
      .map(s => s);

    this.suggestions = [...scheduleSuggestions, ...skillSuggestions].slice(0, 6);
  }

  onSearchFocus() {
    this.searchFocused = true;
    this.updateSuggestions();
  }

  applySuggestion(suggestion: string) {
    const words = this.searchQuery.trim().split(/\s+/);
    words.pop(); // Supprimer le dernier mot partiel
    words.push(suggestion);
    this.searchQuery = words.join(' ') + ' ';
    this.updateSuggestions();
    this.parseQuery(this.searchQuery);
    this.searching = true;
    this.search$.next(this.searchQuery);
    this.cdr.detectChanges();
  }

  hideSuggestions() {
    // Délai pour laisser le (mousedown) d'une suggestion se déclencher avant
    // que le blur ne referme le dropdown.
    setTimeout(() => {
      this.searchFocused = false;
      this.cdr.detectChanges();
    }, 150);
  }

  // ── Réinitialisation ──────────────────────────────────────────────────────
  get hasActiveFilters(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  resetFilters() {
    this.searchQuery     = '';
    this.parsedCompany   = '';
    this.parsedSchedule  = '';
    this.parsedMinSalary = null;
    this.parsedSkills    = [];
    this.suggestions     = [];
    this.searchFocused   = false;
    this.searching = true;
    this.search$.next('');
  }

  // ── Badges des filtres actifs (affichage) ─────────────────────────────────
  get activeFilterBadges(): { label: string; type: string }[] {
    const badges: { label: string; type: string }[] = [];
    if (this.parsedSchedule)
      badges.push({ label: this.parsedSchedule, type: 'schedule' });
    if (this.parsedMinSalary !== null)
      badges.push({ label: `≥ ${this.parsedMinSalary} TND`, type: 'salary' });
    if (this.parsedCompany)
      badges.push({ label: `"${this.parsedCompany}"`, type: 'text' });
    return badges;
  }
}