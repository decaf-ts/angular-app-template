import { inject, Injectable } from '@angular/core';
import { LoggedClass } from '@decaf-ts/logging';
import { type ExternalFile } from '@pharmaledgerassoc/ptp-toolkit/shared';
import type { ExternalFileContext } from '@pharmaledgerassoc/ptp-toolkit';
import { Environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

/**
 * Backend-proxied external-documents route base.
 *
 * The ew-frontend NEVER talks to S3 directly. Both uploads and content are
 * proxied by the ew-backend (implemented in parallel). Isolating these paths
 * here means any final path adjustment is a single-line change.
 */
export const EXTERNAL_DOCUMENTS_ROUTE = 'public/leaflet/external';

/**
 * Sentinel used for an absent optional leaflet coordinate (batch / epiType /
 * market). The backend maps it back to `undefined`.
 */
export const EXTERNAL_DOCUMENTS_DEFAULT_SEGMENT = 'default';

/**
 * @fileoverview ExternalFileService
 * @description Client service that isolates the backend-proxied external
 * document routes. Uploads (multipart POST) and content retrieval (GET) both
 * go through the backend; the UI never touches S3 directly.
 */
@Injectable({
  providedIn: 'root',
})
export class ExternalFileService extends LoggedClass {
  private authService = inject(AuthService);

  /**
   * Base backend URL, e.g. `http://localhost:3000`.
   */
  get baseUrl(): string {
    const { ptp } = Environment;
    return `${ptp.protocol}://${ptp.host}`;
  }

  /**
   * Sentinel the backend maps back to `undefined` for an optional leaflet
   * coordinate. `batch`, `epiType` and `market` are all optional on a leaflet,
   * so a missing one is carried as `default` instead of collapsing the path
   * (which would shift every following segment).
   */
  private segment(value?: string): string {
    const trimmed = (value ?? '').trim();
    return encodeURIComponent(trimmed || EXTERNAL_DOCUMENTS_DEFAULT_SEGMENT);
  }

  /**
   * Builds the backend-proxied base path for a leaflet's external documents.
   * Keyed by gtin/batch/epiType/market/lang per backend conventions.
   *
   * `gtin` and `lang` are mandatory and are NEVER sentinel-filled: an empty
   * segment would collapse the path and shift every following segment onto the
   * wrong route, silently storing the document under a scope that belongs to no
   * leaflet. Only the optional coordinates carry the `default` sentinel.
   */
  basePath(key: ExternalFileContext): string {
    const gtin = (key?.gtin ?? '').trim();
    const lang = (key?.lang ?? '').trim();
    if (!gtin || !lang) {
      throw new Error(
        'Cannot address an external document without a leaflet gtin and lang'
      );
    }
    return [
      `${this.baseUrl}/${EXTERNAL_DOCUMENTS_ROUTE}`,
      encodeURIComponent(gtin),
      this.segment(key.batch),
      this.segment(key.epiType),
      this.segment(key.market),
      encodeURIComponent(lang),
    ].join('/');
  }

  /**
   * Builds the backend-proxied content path for a single external document.
   */
  contentPath(key: ExternalFileContext, fileName: string): string {
    return `${this.basePath(key)}/${encodeURIComponent(fileName)}`;
  }

  /**
   * Resolves an authenticated URL for the external document content.
   */
  async contentUrl(key: ExternalFileContext, entry: ExternalFile): Promise<string> {
    await this.ensureToken();
    return this.contentPath(key, entry.fileName);
  }

  /**
   * Reads a File as a base64-encoded string (data portion only).
   */
  private readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? '');
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads a file to the backend, which stores it in S3, and returns the
   * resulting `ExternalFile` metadata. The backend contract accepts a JSON
   * body (`fileName`/`contentType`/`size`/`dataBase64`), not multipart.
   *
   * The upload does NOT write to the ledger: the returned reference is
   * persisted by the normal Leaflet create/update, which is why it works while
   * the leaflet is still being created in the form.
   */
  async upload(
    file: File,
    key: ExternalFileContext,
    contentType: ExternalFile['contentType']
  ): Promise<ExternalFile> {
    const token = await this.ensureToken();
    const path = this.basePath(key);

    const dataBase64 = await this.readAsBase64(file);

    const response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } } : { headers: { 'content-type': 'application/json' } }),
      body: JSON.stringify({
        fileName: file.name,
        contentType,
        size: file.size,
        dataBase64,
      }),
    });

    if (!response.ok) {
      this.log.for(this.upload).error(`External document upload failed (${response.status}): ${response.statusText}`);
      throw new Error(`External document upload failed with status ${response.status}`);
    }

    const data = (await response.json()) as Partial<ExternalFile>;
    return {
      fileName: data.fileName ?? file.name,
      contentType: data.contentType ?? contentType,
      // `??` would keep a backend-reported 0; fall back on any falsy size
      size: data.size || file.size,
      storageKey: data.storageKey ?? '',
      uploadedAt: data.uploadedAt ?? new Date().toISOString(),
    } as ExternalFile;
  }

  private async ensureToken(): Promise<string> {
    const token = await this.authService.getToken();
    return typeof token === 'string' ? token : '';
  }
}
