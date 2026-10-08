import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

jest.mock('@ngx-translate/core', () => {
  const { Pipe } = require('@angular/core');
  return {
    TranslatePipe: Pipe({ name: 'translate', standalone: true })(
      class MockTranslatePipe {
        transform(value: unknown) {
          return value;
        }
      }
    ),
  };
});

import { AppMenuComponent } from './menu.component';

describe('AppMenuComponent', () => {
  let component: AppMenuComponent;
  let fixture: ComponentFixture<AppMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AppMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
