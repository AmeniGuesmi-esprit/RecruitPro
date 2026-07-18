import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Role } from '../core/models/user.model';
import { frontofficeHomeRoute } from '../core/guards/auth.guard';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  firstName = '';
  lastName  = '';
  email     = '';
  phone     = '';
  password  = '';
  role: Role = 'CANDIDATE';

  cvFile:    File | null = null;
  imageFile: File | null = null;
  imagePreview = signal<string | null>(null);

  loading = signal(false);
  error   = signal('');
  success = signal('');

  private readonly GOOGLE_CLIENT_ID =
    '29416346031-vnhm7i7514iptaj745aesilfpc9cfmfs.apps.googleusercontent.com';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const waitForGoogle = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        clearInterval(waitForGoogle);
        (window as any).google.accounts.id.initialize({
          client_id: this.GOOGLE_CLIENT_ID,
          callback: (response: any) => this.handleGoogleResponse(response)
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById('google-register-btn-container'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: 400, 
            text: 'continue_with', 
            locale: 'fr'
          }
        );
      }
    }, 200);
  }

  handleGoogleResponse(response: any) {
    this.error.set('');
    this.auth.googleAuth(response.credential, this.role).subscribe({
      next: (res) => {
        if (res.success) {
          const role = res.data.role;
          this.router.navigate([
            role === 'ADMIN' ? '/backoffice/dashboard' : frontofficeHomeRoute(role)
          ]);
        } else {
          this.error.set(res.message);
        }
      },
      error: () => this.error.set('Erreur Google. Veuillez réessayer.')
    });
  }

  get isCandidate() { return this.role === 'CANDIDATE'; }

  // ── Profile Image ────────────────────────────────────────
  onImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const allowed = ['image/png', 'image/jpeg', 'image/pjpeg'];

    if (!allowed.includes(file.type)) {
      this.error.set('La photo de profil doit être au format PNG, JPG ou JFIF');
      this.imagePreview.set(null);
      this.imageFile = null;
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('La photo ne doit pas dépasser 5 Mo');
      this.imagePreview.set(null);
      this.imageFile = null;
      input.value = '';
      return;
    }

    this.imageFile = file;
    this.error.set('');

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ── CV ─────────────────────────────────────────────────────
  onCvChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.processCvFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const area = event.currentTarget as HTMLElement;
    area.style.borderColor = '#7c5cfc';
    area.style.background = '#f0f0ff';
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const area = event.currentTarget as HTMLElement;
    area.style.borderColor = '';
    area.style.background = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const area = event.currentTarget as HTMLElement;
    area.style.borderColor = '';
    area.style.background = '';

    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processCvFile(file);
    }
  }

  private processCvFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.error.set('Le CV doit être un fichier PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Le CV ne doit pas dépasser 5 Mo');
      return;
    }
    this.cvFile = file;
    this.error.set('');
  }

  removeCv(event: Event) {
    event.stopPropagation();
    this.cvFile = null;
  }

  // ── Form Submission ─────────────────────────────────────────────
  onSubmit() {
    this.error.set('');
    this.success.set('');

    if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.password) {
      this.error.set('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (this.isCandidate && !this.cvFile) {
      this.error.set('Le CV (PDF) est obligatoire pour les candidats');
      return;
    }

    const formData = new FormData();
    formData.append('firstName', this.firstName);
    formData.append('lastName',  this.lastName);
    formData.append('email',     this.email);
    formData.append('phone',     this.phone);
    formData.append('password',  this.password);
    formData.append('role',      this.role);
    if (this.cvFile)    formData.append('cv',    this.cvFile);
    if (this.imageFile) formData.append('image', this.imageFile);

    this.loading.set(true);
    this.auth.register(formData).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.success.set('Inscription réussie ! Vérifiez votre email pour activer votre compte.');
        } else {
          this.error.set(res.message);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    });
  }
}