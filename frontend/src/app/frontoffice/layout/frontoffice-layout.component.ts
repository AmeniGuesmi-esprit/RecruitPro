import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthResponse } from '../../core/models/user.model';

@Component({
  selector: 'app-frontoffice-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './frontoffice-layout.component.html',
  styleUrls: ['./frontoffice-layout.component.scss']
})
export class FrontofficeLayoutComponent implements OnInit {
  dropdownOpen = false;
  user: AuthResponse | null = null;
  private avatarTimestamp = Date.now();

  constructor(public auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  avatarUrl: string = 'assets/images/user/avatar-1.jpg';

  ngOnInit() {
    this.auth.user$.subscribe(u => {
      this.user = u;
      // Recalcule l'URL avec un nouveau timestamp à chaque changement de user
      this.avatarUrl = this.buildAvatarUrl(u?.imagePath);
      this.cdr.markForCheck();
    });
  }

  private buildAvatarUrl(imagePath?: string): string {
    if (!imagePath) return 'assets/images/user/avatar-1.jpg';
    if (imagePath.startsWith('data:')) return imagePath;
    // Extrait uniquement le filename (gère les anciens chemins avec préfixe)
    const filename = imagePath.replace(/\\/g, '/').split('/').pop() || imagePath;
    return `http://localhost:8222/api/users/files/${filename}?t=${Date.now()}`;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  toggleDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar') && !target.closest('.dropdown-menu')) {
      this.dropdownOpen = false;
    }
  }

  logout() {
    this.dropdownOpen = false;
    this.auth.logout();
  }
}