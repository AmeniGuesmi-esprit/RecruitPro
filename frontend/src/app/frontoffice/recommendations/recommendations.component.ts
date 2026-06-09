import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        <h4><i class="ti ti-star me-2"></i>Recommandations</h4>
        <p class="text-muted">Projets recommandés pour vous.</p>
      </div>
    </div>
  `
})
export class RecommendationsComponent {}
