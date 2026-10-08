import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AppSwitcherComponent } from './switcher.component';

describe('AppSwitcherComponent', () => {
  let component: AppSwitcherComponent;
  let fixture: ComponentFixture<AppSwitcherComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AppSwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
