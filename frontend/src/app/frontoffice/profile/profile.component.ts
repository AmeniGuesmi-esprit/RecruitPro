import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  firstName = '';
  lastName = '';
  phone = '';
  password = '';
  cvFile: File | null = null;
  imageFile: File | null = null;
  imagePreview: string | null = null;

  editMode = false;
  showCvModal = false;

  loading = signal(false);
  success = signal('');
  error = signal('');
  showDeleteConfirm = false;

  readonly BASE_URL = 'http://localhost:8222/api/users/files/';
  // Timestamp fixe pour éviter NG0100 (pas de Date.now() dans les getters)
  readonly imgTimestamp = Date.now();

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const current = this.auth.getCurrentUser();
    if (!current?.userId) return;

    this.user = {
      id: current.userId,
      userId: current.userId,
      firstName: current.firstName,
      lastName: current.lastName,
      email: current.email,
      phone: '',
      role: current.role,
      emailVerified: true,
      cvPath: current.cvPath,
      imagePath: current.imagePath
    };
    this.firstName = current.firstName;
    this.lastName = current.lastName;

    this.auth.getProfile(current.userId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.user = res.data;
          this.firstName = res.data.firstName;
          this.lastName = res.data.lastName;
          this.phone = res.data.phone || '';
          // Sauvegarder cvPath dans le localStorage pour le prochain chargement
          this.auth.refreshUserInStorage({
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            cvPath: res.data.cvPath,
            imagePath: res.data.imagePath
          });
        }
      },
      error: () => this.error.set('Impossible de rafraîchir le profil depuis le serveur.')
    });
  }

  get isCandidate(): boolean {
    return this.user?.role === 'CANDIDATE';
  }

  get currentImageUrl(): string {
    if (this.imagePreview) return this.imagePreview;
    if (this.user?.imagePath) {
      const filename = this.extractFilename(this.user.imagePath);
      return `${this.BASE_URL}${filename}?t=${this.imgTimestamp}`;
    }
    return 'assets/images/user/avatar-1.jpg';
  }

  /**
   * Extrait uniquement le nom du fichier depuis un cvPath qui peut être :
   * - Ancien format Windows : "uploads\cv\9db425c9_file.pdf"
   * - Ancien format Unix    : "uploads/cv/9db425c9_file.pdf"
   * - Nouveau format        : "9db425c9_file.pdf"
   */
  private extractFilename(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || path;
  }

  get cvUrl(): SafeResourceUrl | null {
    if (!this.user?.cvPath) return null;
    const filename = this.extractFilename(this.user.cvPath);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${this.BASE_URL}${filename}`);
  }

  get cvFileName(): string {
    if (!this.user?.cvPath) return '';
    const filename = this.extractFilename(this.user.cvPath);
    // Supprime le préfixe UUID (ex: "9db425c9-a473-43cb-83a6-e8544ad5a52c_")
    return filename.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i, '');
  }

  openEdit() {
    this.editMode = true;
    this.success.set('');
    this.error.set('');
  }

  closeEdit() {
    this.editMode = false;
    this.imagePreview = null;
    this.imageFile = null;
    this.cvFile = null;
    this.password = '';
    // Réinitialiser les champs aux valeurs actuelles
    if (this.user) {
      this.firstName = this.user.firstName;
      this.lastName = this.user.lastName;
      this.phone = this.user.phone || '';
    }
  }

  onImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.error.set('Seuls PNG et JPG sont acceptés');
      return;
    }
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onCvChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && file.type === 'application/pdf') this.cvFile = file;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') this.cvFile = file;
  }

  onUpdate() {
    if (!this.user) return;
    this.error.set(''); this.success.set(''); this.loading.set(true);

    const userId = this.user.id ?? this.user.userId!;
    const formData = new FormData();
    formData.append('firstName', this.firstName);
    formData.append('lastName', this.lastName);
    formData.append('phone', this.phone || '');
    if (this.password?.trim()) formData.append('password', this.password);
    if (this.cvFile) formData.append('cv', this.cvFile);
    if (this.imageFile) formData.append('image', this.imageFile);

    this.auth.updateProfile(userId, formData).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.user = res.data;
          this.firstName = res.data.firstName;
          this.lastName = res.data.lastName;
          this.phone = res.data.phone || '';
          // Si une nouvelle image a été uploadée, on passe le base64 en imagePath
          // pour que la nav se mette à jour IMMÉDIATEMENT sans attendre le serveur
          const newImagePath = this.imagePreview ?? res.data.imagePath;
          this.auth.refreshUserInStorage({
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            imagePath: newImagePath,
            cvPath: res.data.cvPath
          });
          this.success.set('✅ Profil mis à jour avec succès !');
          this.password = '';
          this.imageFile = null;
          this.cvFile = null;
          this.imagePreview = null;
          this.editMode = false;
        } else {
          this.error.set(res.message || 'Erreur lors de la mise à jour');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Erreur serveur');
      }
    });
  }

  openCv() {
    if (!this.user?.cvPath) return;
    const filename = this.extractFilename(this.user.cvPath);
    window.open(`${this.BASE_URL}${filename}`, '_blank');
  }

  confirmDelete() { this.showDeleteConfirm = true; }

  deleteAccount() {
    if (!this.user) return;
    const userId = this.user.id ?? this.user.userId!;
    this.auth.deleteAccount(userId).subscribe({
      next: () => this.auth.logout(),
      error: () => this.showDeleteConfirm = false
    });
  }
}