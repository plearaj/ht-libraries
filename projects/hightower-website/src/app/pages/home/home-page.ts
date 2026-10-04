import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'hs-home-page',
  template: '<h1>Hightower Software Technologies</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
