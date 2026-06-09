import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        <h4><i class="ti ti-briefcase me-2"></i>Projets</h4>
        <p class="text-muted">Liste des projets disponibles.</p>
      </div>
    </div>
  `
})
export class ProjectsComponent {}
