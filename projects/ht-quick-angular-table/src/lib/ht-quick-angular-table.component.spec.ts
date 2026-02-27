import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HtQuickAngularTableComponent } from './ht-quick-angular-table.component';

describe('HtQuickAngularTableComponent', () => {
  let component: HtQuickAngularTableComponent;
  let fixture: ComponentFixture<HtQuickAngularTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HtQuickAngularTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HtQuickAngularTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
