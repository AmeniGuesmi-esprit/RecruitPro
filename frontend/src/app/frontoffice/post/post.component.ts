import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        <h4><i class="ti ti-plus me-2"></i>Post</h4>
        <p class="text-muted">Publier une nouvelle offre.</p>
      </div>
    </div>
  `
})
export class PostComponent {}
