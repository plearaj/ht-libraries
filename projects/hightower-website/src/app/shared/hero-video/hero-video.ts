import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InjectionToken,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Image, VideoSource } from '../../content/models';

export function shouldAutoplay(win: Window): boolean {
  const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const nav = win.navigator as Navigator & { connection?: { saveData?: boolean } };
  const saveData = nav.connection?.saveData ?? false;
  return !reducedMotion && !saveData;
}

/** Overridable in tests; only ever called in the browser (inside afterNextRender). */
export const AUTOPLAY_ALLOWED = new InjectionToken<() => boolean>('AUTOPLAY_ALLOWED', {
  providedIn: 'root',
  factory: () => () => typeof window !== 'undefined' && shouldAutoplay(window),
});

@Component({
  selector: 'hs-hero-video',
  templateUrl: './hero-video.html',
  styleUrl: './hero-video.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVideo {
  readonly poster = input.required<Image>();
  readonly sources = input<VideoSource[]>([]);

  protected readonly playing = signal(false);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly autoplayAllowed = inject(AUTOPLAY_ALLOWED);

  constructor() {
    afterNextRender(() => {
      const video = this.video()?.nativeElement;
      if (!video) return;
      // The muted attribute alone doesn't set the muted property on script-created elements.
      video.muted = true;
      if (this.autoplayAllowed()) void this.play();
    });
  }

  protected toggle(): void {
    if (this.playing()) {
      this.video()?.nativeElement.pause();
    } else {
      void this.play();
    }
  }

  private async play(): Promise<void> {
    const video = this.video()?.nativeElement;
    if (!video) return;
    video.muted = true;
    try {
      await video.play();
    } catch {
      this.playing.set(false); // blocked or failed: poster stays, play button offered
    }
  }
}
