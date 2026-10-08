// import 'jest-preset-angular/setup-jest'; // deprecated
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { TextDecoder, TextEncoder } from 'util';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideDecafI18nConfig } from '@decaf-ts/for-angular';
import { AuthService } from './src/app/services/auth.service';
import { of } from 'rxjs';

setupZoneTestEnv();

beforeEach(() =>
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          url: of([]),
          snapshot: { url: [], paramMap: new Map(), queryParamMap: new Map() },
        },
      },
      {
        provide: AuthService,
        useValue: {
          isAllowed: async () => true,
          hasNameSpace: async () => false,
          getUserAccount: async () => undefined,
          getToken: async () => undefined,
          roles$: of([]),
          session$: of(false),
        },
      },
      provideDecafI18nConfig({ fallbackLang: 'en', lang: 'en' }, { prefix: './assets/i18n/', suffix: '.json' }),
    ],
  })
);

// Jest + Ionic
Object.defineProperty(window, 'CSS', { value: null });

// Mocking window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // obsoleto
    removeListener: jest.fn(), // obsoleto
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// JSDOM: https://thymikee.github.io/jest-preset-angular/docs/getting-started/installation/#customizing
Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});

Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: ['-webkit-appearance'],
  }),
});

/**
 * Workaround for JSDOM missing transform property
 */
Object.defineProperty(document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});

(global as Record<string, unknown>)['TextEncoder'] = TextEncoder;
(global as Record<string, unknown>)['TextDecoder'] = TextDecoder;
