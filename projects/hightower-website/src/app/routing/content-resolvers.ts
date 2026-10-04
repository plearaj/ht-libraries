import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { take } from 'rxjs';
import { ContentRepository } from '../content/content-repository';
import { SiteConfig } from '../content/models';

export const siteResolver: ResolveFn<SiteConfig> = () => inject(ContentRepository).site().pipe(take(1));
