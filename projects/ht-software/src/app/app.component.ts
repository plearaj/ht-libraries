import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="toolbar-title">ht-libraries Showcase</span>
    </mat-toolbar>

    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <mat-nav-list>
          <a mat-list-item routerLink="/" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">
            <mat-icon matListItemIcon>home</mat-icon>
            <span matListItemTitle>Home</span>
          </a>
          <a mat-list-item routerLink="/table-demo" routerLinkActive="active-link">
            <mat-icon matListItemIcon>table_chart</mat-icon>
            <span matListItemTitle>Quick Angular Table</span>
          </a>
          <a mat-list-item routerLink="/ngxfire-demo" routerLinkActive="active-link">
            <mat-icon matListItemIcon>local_fire_department</mat-icon>
            <span matListItemTitle>Quick NgxFire</span>
          </a>
          <a mat-list-item routerLink="/camera-demo" routerLinkActive="active-link">
            <mat-icon matListItemIcon>photo_camera</mat-icon>
            <span matListItemTitle>Camera Upload</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .app-toolbar {
      flex-shrink: 0;
      background: #1a1a1a;
      color: #d4af37;
      border-bottom: 2px solid #2e7d32;
    }
    .toolbar-title {
      margin-left: 0.5rem;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .sidenav-container { flex: 1; }
    .sidenav {
      width: 240px;
      background: #1a1a1a;
      border-right: 1px solid #2a2a2a;
    }
    .main-content {
      padding: 0;
      background: #111111;
    }
    .active-link {
      background: rgba(46, 125, 50, 0.2) !important;
      border-left: 3px solid #2e7d32;
    }
  `],
})
export class AppComponent {}
