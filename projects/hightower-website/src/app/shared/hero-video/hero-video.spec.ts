import { TestBed } from '@angular/core/testing';
import { AUTOPLAY_ALLOWED, HeroVideo, shouldAutoplay } from './hero-video';

const POSTER = { src: '/images/poster.webp', alt: 'Tower' };
const SOURCES = [
  { src: '/media/hero.webm', type: 'video/webm' },
  { src: '/media/hero.mp4', type: 'video/mp4' },
];

function fakeWindow(reducedMotion: boolean, saveData?: boolean): Window {
  return {
    matchMedia: () => ({ matches: reducedMotion }),
    navigator: { connection: saveData === undefined ? undefined : { saveData } },
  } as unknown as Window;
}

describe('shouldAutoplay', () => {
  it('allows autoplay by default', () => expect(shouldAutoplay(fakeWindow(false))).toBeTrue());
  it('blocks autoplay for reduced motion', () => expect(shouldAutoplay(fakeWindow(true))).toBeFalse());
  it('blocks autoplay with Save-Data on', () => expect(shouldAutoplay(fakeWindow(false, true))).toBeFalse());
});

describe('HeroVideo', () => {
  async function setup(sources: typeof SOURCES | [], autoplay: boolean) {
    await TestBed.configureTestingModule({
      imports: [HeroVideo],
      providers: [{ provide: AUTOPLAY_ALLOWED, useValue: () => autoplay }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeroVideo);
    fixture.componentRef.setInput('poster', POSTER);
    fixture.componentRef.setInput('sources', sources);
    await fixture.whenStable();
    return fixture;
  }

  function stubMedia(playResult: () => Promise<void> = () => Promise.resolve()) {
    const play = spyOn(HTMLMediaElement.prototype, 'play').and.callFake(function (this: HTMLMediaElement) {
      return playResult().then(() => {
        this.dispatchEvent(new Event('play'));
      });
    });
    const pause = spyOn(HTMLMediaElement.prototype, 'pause').and.callFake(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'));
    });
    return { play, pause };
  }

  const toggleLabel = (el: HTMLElement) => el.querySelector('button')?.getAttribute('aria-label');

  it('renders only the poster image when there are no sources', async () => {
    const el: HTMLElement = (await setup([], true)).nativeElement;
    expect(el.querySelector('video')).toBeNull();
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Tower');
    expect(el.querySelector('button')).toBeNull();
  });

  it('renders a muted, looping, inline video without the autoplay attribute', async () => {
    stubMedia();
    const el: HTMLElement = (await setup(SOURCES, false)).nativeElement;
    const video = el.querySelector('video')!;
    expect(video.hasAttribute('muted')).toBeTrue();
    expect(video.muted).toBeTrue();
    expect(video.hasAttribute('loop')).toBeTrue();
    expect(video.hasAttribute('playsinline')).toBeTrue();
    expect(video.hasAttribute('autoplay')).toBeFalse();
    expect(video.getAttribute('poster')).toBe('/images/poster.webp');
    expect(Array.from(video.querySelectorAll('source')).map((s) => s.getAttribute('type'))).toEqual(['video/webm', 'video/mp4']);
  });

  it('autoplays after render when allowed', async () => {
    const { play } = stubMedia();
    const fixture = await setup(SOURCES, true);
    await fixture.whenStable();
    expect(play).toHaveBeenCalled();
    expect(toggleLabel(fixture.nativeElement)).toBe('Pause background video');
  });

  it('does not autoplay when not allowed and offers a play button', async () => {
    const { play } = stubMedia();
    const fixture = await setup(SOURCES, false);
    expect(play).not.toHaveBeenCalled();
    expect(toggleLabel(fixture.nativeElement)).toBe('Play background video');
  });

  it('toggles between play and pause', async () => {
    stubMedia();
    const fixture = await setup(SOURCES, false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    button.click();
    await fixture.whenStable();
    expect(toggleLabel(fixture.nativeElement)).toBe('Pause background video');

    button.click();
    await fixture.whenStable();
    expect(toggleLabel(fixture.nativeElement)).toBe('Play background video');
  });

  it('keeps the play button when the browser rejects play()', async () => {
    stubMedia(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    const fixture = await setup(SOURCES, true);
    await fixture.whenStable();
    expect(toggleLabel(fixture.nativeElement)).toBe('Play background video');
  });
});
