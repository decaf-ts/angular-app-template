import { ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { AppAllowedForDirective } from './allowed-for.directive';

describe('AppAllowedForDirective', () => {
  it('should create an instance', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
        { provide: AuthService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [] } } },
      ],
    });
    const directive = TestBed.runInInjectionContext(() => new AppAllowedForDirective());
    expect(directive).toBeTruthy();
  });
});
