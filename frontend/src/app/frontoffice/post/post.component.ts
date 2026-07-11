import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, SlicePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { Job, JobRequest, JobStatus } from '../../core/models/job.model';
import { ApplicationResponse, ApplicationStatus } from '../../core/models/application.model';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, SlicePipe, DatePipe],
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss']
})
export class PostComponent implements OnInit {

  myJobs: Job[] = [];
  activeFilter: 'ALL' | 'PUBLISHED' | 'CLOTURE' | 'ARCHIVED' = 'ALL';
  submitting  = false;
  editingId: number | null = null;
  showForm    = false;
  successMsg  = '';
  errorMsg    = '';
  skillInput  = '';
  selectedJob: Job | null = null;

  /** true pendant la vérification de l'abonnement, au clic sur "Créer une offre" */
  checkingSubscription = false;

  logoFile:    File | undefined;
  logoPreview: string | null = null;

  form: JobRequest = this.emptyForm();

  // ── Candidats d'une offre ────────────────────────────────────────────────
  candidatesJob: Job | null = null;
  candidates: ApplicationResponse[] = [];
  candidatesLoading = false;
  candidatesErrorMsg = '';
  /** id de candidature en cours de mise à jour de statut (empêche le double-clic) */
  updatingStatusIds = new Set<number>();

  // ── Suppression / archivage selon présence de candidatures ─────────────────
  /** Nombre de candidatures par offre (jobId → count), utilisé pour savoir si
   *  le bouton "Supprimer" doit se transformer en "Archiver". */
  applicationsCountByJobId: Record<number, number> = {};
  /** id d'offre en cours de suppression (empêche le double-clic) */
  deletingIds = new Set<number>();

  /** Petite box flottante (toast) affichée sur la page liste, ex: après suppression/archivage. */
  toastType: 'success' | 'error' = 'success';
  toastMsg = '';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  /** Modal de confirmation stylée (remplace window.confirm) pour Supprimer / Archiver. */
  confirmDialog: { icon: string; tone: 'danger' | 'warning'; title: string; message: string; confirmLabel: string } | null = null;
  private pendingConfirmAction: (() => void) | null = null;

  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private cdr: ChangeDetectorRef,   // FIX: ajout du ChangeDetectorRef
    private router: Router
  ) {}

  /** Ouvre la modal de confirmation stylée et mémorise l'action à exécuter si l'utilisateur confirme. */
  private askConfirm(dialog: { icon: string; tone: 'danger' | 'warning'; title: string; message: string; confirmLabel: string }, action: () => void) {
    this.confirmDialog = dialog;
    this.pendingConfirmAction = action;
  }

  confirmYes() {
    const action = this.pendingConfirmAction;
    this.confirmDialog = null;
    this.pendingConfirmAction = null;
    action?.();
  }

  confirmNo() {
    this.confirmDialog = null;
    this.pendingConfirmAction = null;
  }

  /** Affiche une petite box de confirmation/erreur en haut de la page liste, avec auto-fermeture. */
  private showToast(type: 'success' | 'error', message: string) {
    clearTimeout(this.toastTimer);
    this.toastType = type;
    this.toastMsg = message;
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => {
      this.toastMsg = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  closeToast() {
    clearTimeout(this.toastTimer);
    this.toastMsg = '';
  }

  ngOnInit() { this.loadMyJobs(); }

  loadMyJobs() {
    this.jobService.getMyJobs().subscribe({
      next: res => {
        this.myJobs = res.data ?? [];
        this.cdr.detectChanges(); // FIX: forcer la détection de changements
        this.loadApplicationsCounts();
      }
    });
  }

  /**
   * Récupère le nombre de candidatures pour chacune de mes offres, afin de
   * savoir si le bouton "Supprimer" doit se transformer en "Archiver"
   * (dès qu'au moins un candidat a postulé, la suppression n'est plus permise).
   */
  private loadApplicationsCounts() {
    this.myJobs.forEach(job => {
      this.applicationService.getApplicationsForJob(job.id).subscribe({
        next: res => {
          this.applicationsCountByJobId[job.id] = (res.data ?? []).length;
          this.cdr.detectChanges();
        },
        error: () => {
          // En cas d'erreur, on ne connaît pas le nombre de candidatures : par
          // précaution on considère qu'il PEUT y en avoir (empêche une suppression
          // à tort tant que l'info n'est pas confirmée).
          this.applicationsCountByJobId[job.id] = 1;
          this.cdr.detectChanges();
        }
      });
    });
  }

  // ── Filtres ───────────────────────────────────────────────────────────────

  get filteredJobs(): Job[] {
    if (this.activeFilter === 'PUBLISHED') return this.myJobs.filter(j => j.status === 'PUBLISHED');
    if (this.activeFilter === 'CLOTURE')   return this.myJobs.filter(j => j.status === 'CLOTURE');
    if (this.activeFilter === 'ARCHIVED')  return this.myJobs.filter(j => j.status === 'ARCHIVED');
    return this.myJobs;
  }

  get publishedCount(): number { return this.myJobs.filter(j => j.status === 'PUBLISHED').length; }
  get clotureCount(): number   { return this.myJobs.filter(j => j.status === 'CLOTURE').length; }
  get archivedCount(): number  { return this.myJobs.filter(j => j.status === 'ARCHIVED').length; }

  setFilter(filter: 'ALL' | 'PUBLISHED' | 'CLOTURE' | 'ARCHIVED') {
    this.activeFilter = filter;
  }

  // ── Détail offre ──────────────────────────────────────────────────────────

  openDetail(job: Job) { this.selectedJob = job; }
  closeDetail()        { this.selectedJob = null; }

  // ── Candidats d'une offre ────────────────────────────────────────────────

  openCandidates(job: Job) {
    this.candidatesJob = job;
    this.candidates = [];
    this.candidatesErrorMsg = '';
    this.candidatesLoading = true;

    this.applicationService.getApplicationsForJob(job.id).subscribe({
      next: res => {
        this.candidates = res.data ?? [];
        this.candidatesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.candidatesLoading = false;
        this.candidatesErrorMsg = 'Impossible de charger les candidats pour cette offre.';
        this.cdr.detectChanges();
      }
    });
  }

  closeCandidates() {
    this.candidatesJob = null;
    this.candidates = [];
    this.candidatesErrorMsg = '';
    this.updatingStatusIds.clear();
  }

  candidateFullName(c: ApplicationResponse): string {
    return `${c.candidateFirstName} ${c.candidateLastName}`;
  }

  applicationStatusLabel(status: ApplicationStatus): string {
    if (status === 'ACCEPTEE_POUR_ENTRETIEN') return 'Accepté pour entretien';
    if (status === 'REFUSEE') return 'Refusé';
    return 'En cours de traitement';
  }

  isUpdatingStatus(c: ApplicationResponse): boolean {
    return this.updatingStatusIds.has(c.id);
  }

  updateCandidateStatus(c: ApplicationResponse, status: ApplicationStatus) {
    if (this.isUpdatingStatus(c) || c.status === status) return;

    this.updatingStatusIds.add(c.id);
    this.cdr.detectChanges();

    this.applicationService.updateStatus(c.id, status).subscribe({
      next: res => {
        const idx = this.candidates.findIndex(x => x.id === c.id);
        if (idx !== -1 && res.data) {
          this.candidates[idx] = { ...this.candidates[idx], status: res.data.status };
        }
        this.updatingStatusIds.delete(c.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.candidatesErrorMsg = 'Impossible de mettre à jour le statut de cette candidature.';
        this.updatingStatusIds.delete(c.id);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Panel control ─────────────────────────────────────────────────────────

  openForm() {
    // Ouverture pour MODIFIER une offre existante : pas de vérification d'abonnement
    // (le quota ne s'applique qu'à la CRÉATION d'une nouvelle offre).
    if (this.editingId) {
      this.resetForm();
      this.showForm = true;
      document.body.classList.add('panel-open');
      return;
    }

    // Ouverture pour CRÉER une offre : on vérifie l'abonnement AVANT d'afficher le
    // formulaire, pour ne pas laisser la company le remplir en entier pour rien.
    if (this.checkingSubscription) return;
    this.checkingSubscription = true;
    this.errorMsg = '';

    this.jobService.canCreate().subscribe({
      next: (res) => {
        this.checkingSubscription = false;
        const status = res.data;
        if (status && !status.canCreate) {
          const reason = status.reason === 'NO_SUBSCRIPTION' ? 'no-subscription' : 'quota-exceeded';
          this.router.navigate(['/frontoffice/abonnement'], { queryParams: { reason } });
          return;
        }
        this.resetForm();
        this.showForm = true;
        document.body.classList.add('panel-open');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkingSubscription = false;
        // 402 renvoyé directement par can-create (cohérent avec le comportement du submit)
        if (err?.status === 402) {
          const reason = (err?.error?.message || '').includes('pas d\'abonnement') ? 'no-subscription' : 'quota-exceeded';
          this.router.navigate(['/frontoffice/abonnement'], { queryParams: { reason } });
          return;
        }
        this.errorMsg = 'Impossible de vérifier votre abonnement pour le moment. Veuillez réessayer.';
        this.cdr.detectChanges();
      }
    });
  }

  closeForm() {
    this.showForm = false;
    this.resetForm();
    document.body.classList.remove('panel-open');
  }

  // ── Skills ────────────────────────────────────────────────────────────────

  addSkill(event: Event) { event.preventDefault(); this.pushSkill(); }
  addSkillBtn()           { this.pushSkill(); }

  private pushSkill() {
    const s = this.skillInput.trim();
    if (s && !this.form.skills.includes(s)) this.form.skills.push(s);
    this.skillInput = '';
  }

  removeSkill(i: number) { this.form.skills.splice(i, 1); }

  // ── Logo ──────────────────────────────────────────────────────────────────

  onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = () => this.logoPreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  // ── Statut / dates ───────────────────────────────────────────────────────

  minDateCloture(): string {
    return this.formatLocalDatetime(new Date());
  }

  /** La date d'entretien doit être postérieure à la date de clôture choisie dans le formulaire. */
  minDateEntretien(): string {
    if (this.form.dateCloture) return this.form.dateCloture;
    return this.formatLocalDatetime(new Date());
  }

  statusLabel(status: JobStatus): string {
    if (status === 'ARCHIVED') return 'ARCHIVÉE';
    if (status === 'CLOTURE')  return 'CLÔTURÉE';
    return 'PUBLIÉE';
  }

  isArchived(job: Job): boolean {
    return job.status === 'ARCHIVED';
  }

  /** Clôturée automatiquement car la date de clôture est dépassée (≠ archivage manuel). */
  isCloture(job: Job): boolean {
    return job.status === 'CLOTURE';
  }

  /** Toute offre qui n'est plus visible publiquement, quelle qu'en soit la raison. */
  isInactive(job: Job): boolean {
    return job.status !== 'PUBLISHED';
  }

  /** Au moins une candidature a déjà été reçue pour cette offre. */
  hasApplications(job: Job): boolean {
    return (this.applicationsCountByJobId[job.id] ?? 0) > 0;
  }

  isDeleting(job: Job): boolean {
    return this.deletingIds.has(job.id);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit() {
    if (!this.validate()) return;
    this.submitting = true;
    this.successMsg = '';
    this.errorMsg   = '';

    const isEditing      = !!this.editingId;
    const savedEditingId = this.editingId;
    const previousJob    = isEditing ? this.myJobs.find(j => j.id === savedEditingId) : undefined;

    const formSnapshot: JobRequest = {
      title:        this.form.title,
      description:  this.form.description,
      skills:       [...this.form.skills],
      salary:       this.form.salary,
      workSchedule: this.form.workSchedule,
      companyName:  this.form.companyName,
      contactEmail: this.form.contactEmail,
      contactPhone: this.form.contactPhone,
      dateCloture:  this.form.dateCloture,
      dateEntretien: this.form.dateEntretien
    };
    const logoSnapshot    = this.logoFile;
    const previewSnapshot = this.logoPreview;

    // Optimistic update
    const tempId = -Date.now();
    const tempJob: Job = {
      id: isEditing ? savedEditingId! : tempId,
      ...formSnapshot,
      logoUrl:     previewSnapshot ?? undefined,
      recruiterId: 0,
      status:      previousJob?.status ?? 'PUBLISHED',
      dateDebut:   previousJob?.dateDebut ?? new Date().toISOString(),
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString()
    };

    if (isEditing) {
      const idx = this.myJobs.findIndex(j => j.id === savedEditingId);
      if (idx !== -1) {
        // FIX: remplacer l'élément par une nouvelle référence pour déclencher la détection
        this.myJobs = [
          ...this.myJobs.slice(0, idx),
          { ...this.myJobs[idx], ...tempJob },
          ...this.myJobs.slice(idx + 1)
        ];
      }
    } else {
      // FIX: nouvelle référence de tableau
      this.myJobs = [tempJob, ...this.myJobs];
    }

    this.successMsg = isEditing ? 'Offre mise à jour !' : 'Offre publiée !';
    this.submitting = false;
    this.closeForm();
    // FIX: forcer le rendu après mise à jour optimiste
    this.cdr.detectChanges();

    const obs = isEditing
      ? this.jobService.updateJob(savedEditingId!, formSnapshot, logoSnapshot)
      : this.jobService.createJob(formSnapshot, logoSnapshot);

    obs.subscribe({
      next: (res) => {
        const realJob = res.data;
        if (!realJob) return;
        if (isEditing) {
          const idx = this.myJobs.findIndex(j => j.id === savedEditingId);
          if (idx !== -1) {
            // FIX: nouvelle référence
            this.myJobs = [
              ...this.myJobs.slice(0, idx),
              realJob,
              ...this.myJobs.slice(idx + 1)
            ];
          }
        } else {
          const tempIdx = this.myJobs.findIndex(j => j.id === tempId);
          if (tempIdx !== -1) {
            // FIX: nouvelle référence
            this.myJobs = [
              ...this.myJobs.slice(0, tempIdx),
              realJob,
              ...this.myJobs.slice(tempIdx + 1)
            ];
          } else {
            // Fallback : si tempId introuvable, recharger depuis le backend
            this.loadMyJobs();
            return;
          }
        }
        this.cdr.detectChanges(); // FIX: forcer le rendu après réponse réelle
      },
      error: (err) => {
        // 402 = pas d'abonnement actif, ou quota d'offres atteint → rediriger vers la page abonnement
        if (!isEditing && err?.status === 402) {
          this.myJobs = this.myJobs.filter(j => j.id !== tempId);
          this.cdr.detectChanges();
          const reason = (err?.error?.message || '').includes('pas d\'abonnement') ? 'no-subscription' : 'quota-exceeded';
          this.router.navigate(['/frontoffice/abonnement'], { queryParams: { reason } });
          return;
        }

        this.errorMsg   = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.successMsg = '';
        if (isEditing) { this.loadMyJobs(); }
        else           {
          this.myJobs = this.myJobs.filter(j => j.id !== tempId);
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ── Edit / Archive ───────────────────────────────────────────────────────

  editJob(job: Job) {
    this.editingId = job.id;
    this.form = {
      title:        job.title,
      description:  job.description,
      skills:       [...job.skills],
      salary:       job.salary,
      workSchedule: job.workSchedule,
      companyName:  job.companyName,
      contactEmail: job.contactEmail,
      contactPhone: job.contactPhone,
      dateCloture:  this.toDatetimeLocal(job.dateCloture),
      dateEntretien: this.toDatetimeLocal(job.dateEntretien)
    };
    this.logoPreview = job.logoUrl ?? null;
    this.logoFile    = undefined;
    this.showForm    = true;
    document.body.classList.add('panel-open');
  }

  archiveJob(job: Job) {
    this.askConfirm(
      {
        icon: 'ti-archive',
        tone: 'warning',
        title: 'Archiver cette offre ?',
        message: `L'offre « ${job.title} » ne sera plus visible publiquement. Vous pourrez toujours consulter ses candidatures.`,
        confirmLabel: 'Archiver'
      },
      () => this.performArchive(job)
    );
  }

  private performArchive(job: Job) {
    // FIX: optimistic update avec nouvelle référence de tableau
    const idx = this.myJobs.findIndex(j => j.id === job.id);
    if (idx !== -1) {
      this.myJobs = [
        ...this.myJobs.slice(0, idx),
        { ...this.myJobs[idx], status: 'ARCHIVED' as JobStatus },
        ...this.myJobs.slice(idx + 1)
      ];
      this.cdr.detectChanges(); // FIX: forcer l'affichage immédiat
    }

    this.jobService.archiveJob(job.id).subscribe({
      next: res => {
        if (res.data) {
          const i = this.myJobs.findIndex(j => j.id === job.id);
          if (i !== -1) {
            // FIX: nouvelle référence + s'assurer que le statut est bien ARCHIVED
            this.myJobs = [
              ...this.myJobs.slice(0, i),
              { ...this.myJobs[i], ...res.data, status: 'ARCHIVED' as JobStatus },
              ...this.myJobs.slice(i + 1)
            ];
          }
        }
        this.showToast('success', `Offre « ${job.title} » archivée avec succès.`);
      },
      error: () => {
        // En cas d'erreur, recharger la vraie liste depuis le backend
        this.loadMyJobs();
        this.showToast('error', `Impossible d'archiver l'offre « ${job.title} ». Veuillez réessayer.`);
      }
    });
  }

  /**
   * Supprime définitivement une offre — uniquement disponible tant qu'aucun
   * candidat n'a postulé (voir hasApplications() / le template). Si le backend
   * refuse (409, quelqu'un vient de postuler entre-temps), on recharge la liste
   * pour laisser apparaître le bouton "Archiver" à la place.
   */
  deleteJob(job: Job) {
    if (this.isDeleting(job)) return;
    if (this.hasApplications(job)) return; // sécurité : ne devrait pas être appelable depuis le template

    this.askConfirm(
      {
        icon: 'ti-trash',
        tone: 'danger',
        title: 'Supprimer cette offre ?',
        message: `L'offre « ${job.title} » sera supprimée définitivement. Cette action est irréversible.`,
        confirmLabel: 'Supprimer définitivement'
      },
      () => this.performDelete(job)
    );
  }

  private performDelete(job: Job) {
    this.deletingIds.add(job.id);
    this.errorMsg = '';
    this.successMsg = '';

    // FIX: retrait optimiste de la liste
    const previousJobs = this.myJobs;
    this.myJobs = this.myJobs.filter(j => j.id !== job.id);
    this.cdr.detectChanges();

    this.jobService.deleteJob(job.id).subscribe({
      next: () => {
        this.deletingIds.delete(job.id);
        delete this.applicationsCountByJobId[job.id];
        this.showToast('success', `Offre « ${job.title} » supprimée avec succès.`);
      },
      error: (err) => {
        this.deletingIds.delete(job.id);
        // Restaure la liste (409 = une candidature vient d'arriver, ou autre erreur)
        this.myJobs = previousJobs;
        const msg = err?.status === 409
          ? (err?.error?.message || `L'offre « ${job.title} » a déjà reçu une candidature, elle ne peut plus être supprimée. Archivez-la à la place.`)
          : `Impossible de supprimer l'offre « ${job.title} ». Veuillez réessayer.`;
        this.showToast('error', msg);
        // On recharge les compteurs pour que le bouton bascule vers "Archiver" si besoin
        this.loadApplicationsCounts();
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  scheduleColor(schedule: string): string {
    const map: Record<string, string> = {
      'CDI': 'green', 'CDD': 'blue', 'Freelance': 'purple',
      'Stage': 'orange', 'Alternance': 'cyan', 'Temps partiel': 'pink'
    };
    return map[schedule] ?? 'default';
  }

  private validate(): boolean {
    const f = this.form;
    if (!f.title || !f.description || !f.workSchedule || !f.companyName || !f.contactEmail) {
      this.errorMsg = 'Veuillez remplir tous les champs obligatoires.';
      return false;
    }
    if (f.skills.length === 0) { this.errorMsg = 'Ajoutez au moins une compétence.'; return false; }
    if (!f.salary || f.salary <= 0) { this.errorMsg = 'Le salaire doit être supérieur à 0.'; return false; }
    if (!f.dateCloture) { this.errorMsg = 'La date de clôture est obligatoire.'; return false; }
    if (new Date(f.dateCloture).getTime() <= Date.now()) {
      this.errorMsg = 'La date de clôture doit être postérieure à la date actuelle.';
      return false;
    }
    if (!f.dateEntretien) { this.errorMsg = 'La date d\'entretien est obligatoire.'; return false; }
    if (new Date(f.dateEntretien).getTime() <= new Date(f.dateCloture).getTime()) {
      this.errorMsg = 'La date d\'entretien doit être postérieure à la date de clôture.';
      return false;
    }
    return true;
  }

  private formatLocalDatetime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private toDatetimeLocal(iso: string): string {
    return iso ? iso.substring(0, 16) : '';
  }

  private defaultDateCloture(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return this.formatLocalDatetime(d);
  }

  /** Par défaut, 1 jour après la date de clôture par défaut. */
  private defaultDateEntretien(): string {
    const d = new Date();
    d.setDate(d.getDate() + 31);
    return this.formatLocalDatetime(d);
  }

  private emptyForm(): JobRequest {
    return {
      title: '', description: '', skills: [], salary: 0,
      workSchedule: '', companyName: '', contactEmail: '', contactPhone: '',
      dateCloture: this.defaultDateCloture(),
      dateEntretien: this.defaultDateEntretien()
    };
  }

  private resetForm() {
    this.form        = this.emptyForm();
    this.editingId   = null;
    this.logoFile    = undefined;
    this.logoPreview = null;
    this.skillInput  = '';
    this.successMsg  = '';
    this.errorMsg    = '';
  }
}