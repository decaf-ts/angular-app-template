/**
 * @fileoverview ExternalFile shared helpers.
 * @description The Leaflet `ExternalFile` contract types and constants come from
 * `@pharmaledgerassoc/ptp-toolkit` (see `ExternalFile`, `ExternalFileContext`,
 * `AllowedExternalFileTypes`, `EXTERNAL_FILE_MAX_SIZE_BYTES`). This module keeps
 * only the UI-facing helpers that are specific to the ew-frontend upload input.
 */
import { ValidationError } from '@decaf-ts/db-decorators';
import { AllowedExternalFileTypes, ExternalFile } from '@pharmaledgerassoc/ptp-toolkit/shared';

export const EXTERNAL_FILE_MAX_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Accepted file extensions / MIME types used by the upload input.
 */
export const EXTERNAL_FILE_ACCEPT: string[] = [
  '.mp4',
  '.png',
  '.jpg',
  '.jpeg',
  '.pdf',
  'video/mp4',
  'image/png',
  'image/jpeg',
  'application/pdf',
];

/**
 * Maps a guessed MIME type for a File onto the contract content type.
 */
export function normalizeExternalContentType(type: string): ExternalFile['contentType'] {
  const normalized = (type || '').toLowerCase();
  if (normalized === 'video/mp4' || normalized === 'video/quicktime') {
    return AllowedExternalFileTypes.VIDEO_MP4;
  }
  if (normalized === 'image/png' || normalized === 'image/x-png') {
    return AllowedExternalFileTypes.IMAGE_PNG;
  }
  if (normalized === 'image/jpeg' || normalized === 'image/jpg' || normalized === 'image/pjpeg') {
    return AllowedExternalFileTypes.IMAGE_JPG;
  }
  if (normalized === 'application/pdf' || normalized === 'application/x-pdf') {
    return AllowedExternalFileTypes.DOCUMENT_PDF;
  }
  // Fall back based on extension so the UI can still flag the file as accepted.
  const ext = type.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'mp4':
      return AllowedExternalFileTypes.VIDEO_MP4;
    case 'png':
      return AllowedExternalFileTypes.IMAGE_PNG;
    case 'jpg':
    case 'jpeg':
      return AllowedExternalFileTypes.IMAGE_JPG;
    case 'pdf':
      return AllowedExternalFileTypes.DOCUMENT_PDF;
    default:
      throw new ValidationError('Content format is not accepted');
  }
}

/**
 * Sentinels the backend uses for the optional leaflet coordinates of a stored
 * external document key.
 */
const NO_BATCH_SEGMENT = '__nobatch';
const DEFAULT_SEGMENT = 'default';

/**
 * Composite context used to derive the storage key of an external document.
 *
 * Mirrors the toolkit's `ExternalFileContext` (not exported from `shared`,
 * which is the only allowed import surface), so it is redeclared here.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ExternalFileContext = {
  gtin: string;
  batch?: string;
  epiType?: string;
  market: string;
  lang: string;
};

/**
 * Recovers the leaflet coordinates from a stored `ExternalFile.storageKey`.
 *
 * The key is `{gtin}/{batch|__nobatch}/{epiType|default}/{market|default}/{lang}/{fileName}`,
 * so a stored entry always carries the scope it belongs to. This is the only
 * reliable source on a read page, where no form holds the leaflet values.
 */
export function parseExternalStorageKey(storageKey?: string):
  | {
      gtin: string;
      batch?: string;
      epiType?: string;
      market?: string;
      lang: string;
    }
  | undefined {
  const segments = (storageKey ?? '').replace(/^\/+|\/+$/g, '').split('/');
  if (segments.length < 6) {
    return undefined;
  }
  const [gtin, batch, epiType, market, lang] = segments.slice(-6);
  if (!gtin || !lang) {
    return undefined;
  }
  return {
    gtin,
    batch: batch === NO_BATCH_SEGMENT ? undefined : batch,
    epiType: epiType === DEFAULT_SEGMENT ? undefined : epiType,
    market: market === DEFAULT_SEGMENT ? undefined : market,
    lang,
  };
}
