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

import { AppCardTitleComponent } from './card-title.component';

describe('AppCardTitleComponent', () => {
  let component: AppCardTitleComponent;
  let fixture: ComponentFixture<AppCardTitleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AppCardTitleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppCardTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
