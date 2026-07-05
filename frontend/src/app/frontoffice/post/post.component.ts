import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, SlicePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../core/services/job.service';
import { Job, JobRequest, JobStatus } from '../../core/models/job.model';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, SlicePipe, DatePipe],
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss']
})
export class PostComponent implements OnInit {

  myJobs: Job[] = [];
  activeFilter: 'ALL' | 'PUBLISHED' | 'ARCHIVED' = 'ALL';
  submitting  = false;
  editingId: number | null = null;
  showForm    = false;
  successMsg  = '';
  errorMsg    = '';
  skillInput  = '';
  selectedJob: Job | null = null;

  logoFile:    File | undefined;
  logoPreview: string | null = null;

  form: JobRequest = this.emptyForm();

  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef   // FIX: ajout du ChangeDetectorRef
  ) {}

  ngOnInit() { this.loadMyJobs(); }

  loadMyJobs() {
    this.jobService.getMyJobs().subscribe({
      next: res => {
        this.myJobs = res.data ?? [];
        this.cdr.detectChanges(); // FIX: forcer la détection de changements
      }
    });
  }

  // ── Filtres ───────────────────────────────────────────────────────────────

  get filteredJobs(): Job[] {
    if (this.activeFilter === 'PUBLISHED') return this.myJobs.filter(j => !this.isArchived(j));
    if (this.activeFilter === 'ARCHIVED')  return this.myJobs.filter(j => this.isArchived(j));
    return this.myJobs;
  }

  get publishedCount(): number { return this.myJobs.filter(j => !this.isArchived(j)).length; }
  get archivedCount(): number  { return this.myJobs.filter(j => this.isArchived(j)).length; }

  setFilter(filter: 'ALL' | 'PUBLISHED' | 'ARCHIVED') {
    this.activeFilter = filter;
  }

  // ── Détail offre ──────────────────────────────────────────────────────────

  openDetail(job: Job) { this.selectedJob = job; }
  closeDetail()        { this.selectedJob = null; }

  // ── Panel control ─────────────────────────────────────────────────────────

  openForm() {
    this.resetForm();
    this.showForm = true;
    document.body.classList.add('panel-open');
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

  statusLabel(status: JobStatus): string {
    return status === 'ARCHIVED' ? 'ARCHIVÉ' : 'PUBLIÉ';
  }

  isArchived(job: Job): boolean {
    return job.status === 'ARCHIVED';
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
      salaryMin:    this.form.salaryMin,
      salaryMax:    this.form.salaryMax,
      workSchedule: this.form.workSchedule,
      companyName:  this.form.companyName,
      contactEmail: this.form.contactEmail,
      contactPhone: this.form.contactPhone,
      dateCloture:  this.form.dateCloture
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
      error: () => {
        this.errorMsg   = 'Une erreur est survenue. Veuillez réessayer.';
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
      salaryMin:    job.salaryMin,
      salaryMax:    job.salaryMax,
      workSchedule: job.workSchedule,
      companyName:  job.companyName,
      contactEmail: job.contactEmail,
      contactPhone: job.contactPhone,
      dateCloture:  this.toDatetimeLocal(job.dateCloture)
    };
    this.logoPreview = job.logoUrl ?? null;
    this.logoFile    = undefined;
    this.showForm    = true;
    document.body.classList.add('panel-open');
  }

  archiveJob(id: number) {
    if (!confirm('Archiver cette offre ? Elle ne sera plus visible publiquement.')) return;

    // FIX: optimistic update avec nouvelle référence de tableau
    const idx = this.myJobs.findIndex(j => j.id === id);
    if (idx !== -1) {
      this.myJobs = [
        ...this.myJobs.slice(0, idx),
        { ...this.myJobs[idx], status: 'ARCHIVED' as JobStatus },
        ...this.myJobs.slice(idx + 1)
      ];
      this.cdr.detectChanges(); // FIX: forcer l'affichage immédiat
    }

    this.jobService.archiveJob(id).subscribe({
      next: res => {
        if (!res.data) {
          // Même sans data, garder le statut ARCHIVED local (optimistic est déjà fait)
          return;
        }
        const i = this.myJobs.findIndex(j => j.id === id);
        if (i !== -1) {
          // FIX: nouvelle référence + s'assurer que le statut est bien ARCHIVED
          this.myJobs = [
            ...this.myJobs.slice(0, i),
            { ...this.myJobs[i], ...res.data, status: 'ARCHIVED' as JobStatus },
            ...this.myJobs.slice(i + 1)
          ];
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // En cas d'erreur, recharger la vraie liste depuis le backend
        this.loadMyJobs();
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
    if (!f.dateCloture) { this.errorMsg = 'La date de clôture est obligatoire.'; return false; }
    if (new Date(f.dateCloture).getTime() <= Date.now()) {
      this.errorMsg = 'La date de clôture doit être postérieure à la date actuelle.';
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

  private emptyForm(): JobRequest {
    return {
      title: '', description: '', skills: [], salaryMin: 0, salaryMax: 0,
      workSchedule: '', companyName: '', contactEmail: '', contactPhone: '',
      dateCloture: this.defaultDateCloture()
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