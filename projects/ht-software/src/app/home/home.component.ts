import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface LibraryEntry {
  name: string;
  npmPackage: string;
  description: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home-container">
      <h1>ht-libraries Showcase</h1>
      <p class="subtitle">Interactive demos for every published library. Click a card to explore.</p>

      <div class="card-grid">
        @for (lib of libraries; track lib.npmPackage) {
          <mat-card class="lib-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="card-icon">{{ lib.icon }}</mat-icon>
              <mat-card-title>{{ lib.name }}</mat-card-title>
              <mat-card-subtitle>{{ lib.npmPackage }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>{{ lib.description }}</p>
            </mat-card-content>
            <mat-card-actions>
              <a mat-raised-button color="primary" [routerLink]="lib.route">View Demo</a>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      margin-bottom: 0.25rem;
      color: #d4af37;
    }
    .subtitle { color: #aaa; margin-bottom: 2rem; }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .lib-card {
      height: 100%;
      background: #1e1e1e;
      border: 1px solid #333;
    }
    .card-icon {
      font-size: 2rem;
      width: 40px;
      height: 40px;
      color: #2e7d32;
    }
    mat-card-content { padding-top: 0.5rem; }
    mat-card-actions { padding: 0.5rem 1rem 1rem; }
  `],
})
export class HomeComponent {
  readonly libraries: LibraryEntry[] = [
    {
      name: 'Quick Angular Table',
      npmPackage: 'ht-quick-angular-table',
      description: 'Full-featured Angular Material table from a single configuration class. Sorting, filtering, pagination, charts, AI insights, and autonomous agent actions.',
      route: '/table-demo',
      icon: 'table_chart',
    },
    {
      name: 'Quick NgxFire',
      npmPackage: 'ht-quick-ngxfire',
      description: 'Firebase authentication UI, Firestore CRUD, Cloud Storage, role-based guards, and admin services — all preconfigured with a single provider call.',
      route: '/ngxfire-demo',
      icon: 'local_fire_department',
    },
    {
      name: 'Camera Upload',
      npmPackage: 'ht-camera-upload',
      description: 'Cross-platform camera capture and file selection with image resizing, format conversion, and pluggable upload handlers. Works with Capacitor and browsers.',
      route: '/camera-demo',
      icon: 'photo_camera',
    },
  ];
}
