import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { SkillRegistryService } from './skill-registry.service';
import { Skill } from './skill.types';

@Component({
  selector: 'ht-skill-menu',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skill-menu.component.html',
  styleUrl: './skill-menu.component.scss',
})
export class HtSkillMenuComponent {
  protected readonly registry = inject(SkillRegistryService);
  readonly skillSelected = output<Skill>();
}
