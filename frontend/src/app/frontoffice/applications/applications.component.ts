import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        <h4><i class="ti ti-file-text me-2"></i>Projets Postulés</h4>
        <p class="text-muted">Vos candidatures en cours.</p>
      </div>
    </div>
  `
})
export class ApplicationsComponent {}
