import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROJECT_KIND_LABEL, STATUS_LABEL, projectLink } from '../../content/labels';
import { Project, ProjectKind } from '../../content/models';

const CTA: Record<ProjectKind, string> = {
  lab: 'Inside the lab',
  product: 'View product',
  client: 'View project',
};

@Component({
  selector: 'hs-project-card',
  imports: [RouterLink],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCard {
  readonly project = input.required<Project>();
  protected readonly link = computed(() => projectLink(this.project()));
  protected readonly kindLabel = computed(() => PROJECT_KIND_LABEL[this.project().kind]);
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.project().status]);
  protected readonly cta = computed(() => CTA[this.project().kind]);
}
