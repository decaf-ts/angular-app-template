import { Injectable } from '@angular/core';
import { KeyValue } from '@decaf-ts/for-angular';
import { LoggedClass } from '@decaf-ts/logging';
import { SessionKeys } from '../utils/constants';
import { StorageEntry } from '../utils/types';

/**
 * @fileoverview Session Storage Service
 * @description This service provides a comprehensive interface for managing browser session storage
 * with automatic JSON serialization/deserialization and error handling
 *
 */

@Injectable({
  providedIn: 'root',
})
export class SessionService extends LoggedClass {
  /**
   * @description Browser session storage instance.
   * @summary Direct reference to the browser's sessionStorage API for storing data
   * that persists only for the current browser session. Data is automatically
   * cleared when the browser tab is closed or the session ends.
   *
   * @private
   * @type {Storage}
   * @memberOf SessionService
   */
  private storage: Storage = sessionStorage;

  /**
   * @description Retrieves values from session storage with automatic parsing.
   * @summary Fetches data from session storage and automatically handles JSON parsing.
   * When no key is provided, returns all session storage entries as an object.
   * Gracefully handles JSON parsing errors by returning the raw string value.
   *
   * @param {string} key - The storage key to retrieve (optional for getting all entries)
   * @returns {Promise<StorageEntry>} Promise resolving to the stored value or object of all entries
   * @memberOf SessionService
   *
   * @example
   * ```typescript
   * // Get specific value
   * const userPrefs = await sessionService.get('user-preferences');
   *
   * // Get all session entries
   * const allData = await sessionService.get();
   *
   * // Handle different return types
   * if (typeof userPrefs === 'object') {
   *   console.log('Parsed object:', userPrefs);
   * } else {
   *   console.log('String value:', userPrefs);
   * }
   * ```
   */
  async get(key?: keyof typeof SessionKeys): Promise<StorageEntry> {
    const parseResult = (data: string | null) => {
      let result;
      try {
        result = JSON.parse(data as string);
      } catch (error: unknown) {
        result = data;
      }
      return result;
    };

    if (key) {
      return parseResult(this.storage.getItem(key));
    }
    const storage = this.storage;
    const result: KeyValue = {};
    for (const [key, value] of Object.entries(SessionKeys)) {
      result[key] = parseResult(value);
    }
    return result;
  }

  /**
   * @description Stores values in session storage with automatic serialization.
   * @summary Saves data to session storage, automatically converting objects to JSON strings.
   * String values are stored directly without modification. All values persist only
   * for the current browser session.
   *
   * @param {string} key - The storage key for the entry
   * @param {StorageEntry} value - The value to store (string or object)
   * @returns {Promise<void>} Promise that resolves when the value is stored
   * @memberOf SessionService
   *
   * @example
   * ```typescript
   * // Store an object (automatically serialized)
   * await sessionService.set('user-data', {
   *   id: 123,
   *   name: 'John Doe'
   * });
   *
   * // Store a string value
   * await sessionService.set('theme', 'dark');
   *
   * // Store complex data
   * await sessionService.set('app-config', {
   *   features: ['feature1', 'feature2'],
   *   settings: { debug: true }
   * });
   * ```
   */
  async set(key: string, value: StorageEntry): Promise<void> {
    this.storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  /**
   * @description Clears all session storage data.
   * @summary Alias method for clearing all session storage entries. This method
   * provides semantic clarity when the operation is conceptually destroying
   * the entire session rather than deleting specific entries.
   *
   * @returns {Promise<void>} Promise that resolves when all session data is cleared
   * @memberOf SessionService
   *
   * @example
   * ```typescript
   * // Clear all session data (e.g., on logout)
   * await sessionService.destroy();
   * ```
   */
  async destroy(): Promise<void> {
    await this.delete();
  }

  /**
   * @description Removes entries from session storage.
   * @summary Deletes specific entries by key, multiple entries by key array,
   * or all entries when no key is provided. This method provides flexible
   * deletion capabilities for managing session storage cleanup.
   *
   * @param {string | string[]} [key] - Single key, array of keys, or undefined for all entries
   * @returns {Promise<void>} Promise that resolves when deletion is complete
   * @memberOf SessionService
   *
   * @example
   * ```typescript
   * // Delete single entry
   * await sessionService.delete('user-preferences');
   *
   * // Delete multiple entries
   * await sessionService.delete(['key1', 'key2', 'key3']);
   *
   * // Delete all entries
   * await sessionService.delete();
   * ```
   */
  async delete(key?: string | string[]): Promise<void> {
    if (!key) return this.storage.clear();
    if (Array.isArray(key)) {
      key.forEach((k) => this.storage.removeItem(k));
    } else {
      this.storage.removeItem(key);
    }
  }
}
