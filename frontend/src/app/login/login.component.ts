import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { frontofficeHomeRoute } from '../core/guards/auth.guard';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  private readonly GOOGLE_CLIENT_ID = '29416346031-vnhm7i7514iptaj745aesilfpc9cfmfs.apps.googleusercontent.com';

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
          document.getElementById('google-login-btn-container'),
          {
            theme: 'outline',
            size: 'large',
            width: 400,
            text: 'signin_with',
            locale: 'fr'
          }
        );
      }
    }, 200);
  }

  handleGoogleResponse(response: any) {
    this.error.set('');
    this.auth.googleAuth(response.credential).subscribe({
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

  onSubmit() {
    if (!this.email || !this.password) {
      this.error.set('Veuillez remplir tous les champs');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          const role = res.data.role;
          this.router.navigate([
            role === 'ADMIN' ? '/backoffice/dashboard' : frontofficeHomeRoute(role)
          ]);
        } else {
          this.error.set(res.message);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Erreur de connexion. Veuillez réessayer.');
      }
    });
  }
}