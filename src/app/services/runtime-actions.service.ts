import { Injectable } from '@angular/core';
import { windowEventEmitter } from '@decaf-ts/for-angular';

@Injectable({
  providedIn: 'root',
})
export class Utils {
  
  static selectLanguage(language: string): void {
    windowEventEmitter("LanguageChange", {
      data: language,
    });
  }
}
