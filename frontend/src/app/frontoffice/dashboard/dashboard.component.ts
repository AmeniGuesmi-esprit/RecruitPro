import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-frontoffice-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class FrontofficeDashboardComponent {
  constructor(public auth: AuthService) {}
  get user() { return this.auth.getCurrentUser(); }
}
