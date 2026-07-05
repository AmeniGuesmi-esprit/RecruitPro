import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

/**
 * Page profil dédiée au backoffice (ADMIN) — distincte de celle du frontoffice
 * (candidat/société) : pas de gestion de CV, badge de rôle "Administrateur".
 */
@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.scss']
})
export class AdminProfileComponent implements OnInit {
  user: User | null = null;
  firstName = '';
  lastName = '';
  phone = '';
  password = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;

  editMode = false;
  showDeleteConfirm = false;

  loading = signal(false);
  success = signal('');
  error = signal('');

  readonly BASE_URL = 'http://localhost:8222/api/users/files/';
  // Timestamp fixe pour éviter NG0100 (pas de Date.now() dans les getters)
  readonly imgTimestamp = Date.now();

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef
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
          this.auth.refreshUserInStorage({
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            imagePath: res.data.imagePath
          });
        }
      },
      error: () => this.error.set('Impossible de rafraîchir le profil depuis le serveur.')
    });
  }

  get currentImageUrl(): string {
    if (this.imagePreview) return this.imagePreview;
    if (this.user?.imagePath) {
      const filename = this.extractFilename(this.user.imagePath);
      return `${this.BASE_URL}${filename}?t=${this.imgTimestamp}`;
    }
    return 'assets/images/user/avatar-1.jpg';
  }

  private extractFilename(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || path;
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
    this.password = '';
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

  onUpdate() {
    if (!this.user) return;
    this.error.set(''); this.success.set(''); this.loading.set(true);

    const userId = this.user.id ?? this.user.userId!;
    const formData = new FormData();
    formData.append('firstName', this.firstName);
    formData.append('lastName', this.lastName);
    formData.append('phone', this.phone || '');
    if (this.password?.trim()) formData.append('password', this.password);
    if (this.imageFile) formData.append('image', this.imageFile);

    this.auth.updateProfile(userId, formData).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.user = res.data;
          this.firstName = res.data.firstName;
          this.lastName = res.data.lastName;
          this.phone = res.data.phone || '';
          const newImagePath = this.imagePreview ?? res.data.imagePath;
          this.auth.refreshUserInStorage({
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            imagePath: newImagePath
          });
          this.success.set('✅ Profil mis à jour avec succès !');
          this.password = '';
          this.imageFile = null;
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
