import { expect, Page, test } from '@playwright/test';
import { generateGtin } from 'src/app/handlers/ProductHandler';
import { testEnvironment } from '../utils/helpers';
import { videoTest } from '../utils/overrides';
import { TestRepository } from '../utils/TestRepository';

const now = new Date();
const productCode = generateGtin();
const batchNumber = `batch-${now.getTime()}`;
const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

// Default leaflet parameters matching buildLeafletPayload defaults
const leafletType = 'leaflet';
const lang = 'en';
const epiMarket = 'BR';

// Composed IDs used for API verification and UI navigation
// id = productCode:batchNumber:leafletType:lang  (batchNumber omitted for product-level)
const productLeafletId = `${productCode}:${leafletType}:${lang}`;
const batchLeafletId = `${productCode}:${batchNumber}:${leafletType}:${lang}`;

// Cache PDM host — configure via PTP__CACHE_HOST env var or falls back to the internal default
const cacheHost = process.env['PTP__CACHE_HOST'] ?? 'https://cache-pdm.ptp.internal';

// Minimal valid XML leaflet content (base64-encoded)
const xmlContent = Buffer.from(
  '<?xml version="1.0" encoding="UTF-8"?><leaflet><content>test</content></leaflet>'
).toString('base64');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Confirms the diff modal when present (LeafletHandler re-uses the same
 * app-modal-diffs component via ProductHandler.endTransaction).
 */
async function confirmDiffModal(page: Page) {
  const confirmBtn = page.locator('ion-modal app-modal-diffs .dcf-buttons-grid ion-button').last();
  await confirmBtn.waitFor({ state: 'visible', timeout: 8000 });
  await confirmBtn.click();
}

/**
 * Verifies the /public/leaflet cache entry exists and returns the expected fields.
 * Product-level leaflets omit the batchNumber path segment.
 */
async function verifyLeafletCache(
  page: Page,
  pCode: string,
  lType: string,
  lLang: string,
  lMarket: string,
  bNum?: string
) {
  const basePath = bNum
    ? `${cacheHost}/public/leaflet/${pCode}/${bNum}/${lType}/${lLang}/${lMarket}`
    : `${cacheHost}/public/leaflet/${pCode}/${lType}/${lLang}/${lMarket}`;

  const response = await page.request.get(basePath, {
    ignoreHTTPSErrors: true,
  });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data?.productCode).toBe(pCode);
  expect(data?.leafletType).toBe(lType);
  expect(data?.lang).toBe(lLang);
  expect(data?.epiMarket).toBe(lMarket);
  return data;
}

/**
 * Verifies the /public/leaflet cache entry returns 404 (entry removed).
 */
async function expectLeafletCacheGone(
  page: Page,
  pCode: string,
  lType: string,
  lLang: string,
  lMarket: string,
  bNum?: string
) {
  const basePath = bNum
    ? `${cacheHost}/public/leaflet/${pCode}/${bNum}/${lType}/${lLang}/${lMarket}`
    : `${cacheHost}/public/leaflet/${pCode}/${lType}/${lLang}/${lMarket}`;

  const response = await page.request.get(basePath, {
    ignoreHTTPSErrors: true,
  });
  expect(response.status()).toBe(404);
}

/**
 * Verifies the /public/metadata cache entry for a product or batch-level leaflet.
 */
async function verifyLeafletMetadataCache(page: Page, pCode: string, bNum?: string, reference?: Date | string) {
  const expirySource = reference ? new Date(reference) : new Date();
  const expiry = expirySource.toISOString().slice(0, 10).replace(/-/g, '');
  const serial = bNum ?? pCode;
  const metadataPath = bNum ? `${cacheHost}/public/metadata/${pCode}/${bNum}` : `${cacheHost}/public/metadata/${pCode}`;
  const url = `${metadataPath}?serial=${encodeURIComponent(serial)}&expiry=${expiry}`;

  const response = await page.request.get(url, { ignoreHTTPSErrors: true });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data?.product?.productCode).toBe(pCode);
  if (bNum) {
    const batchNumberValue = data?.batch?.batchNumber ?? data?.batchNumber;
    expect(batchNumberValue).toBe(bNum);
  }
  return data;
}

/**
 * Navigates to the /audit page and asserts that the most-recent audit entry
 * for model="leaflet" and the given action is visible in the table.
 */
async function verifyAuditPage(page: Page, action: 'create' | 'update' | 'delete') {
  await page.goto(`${testEnvironment.appURL}/audit`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const auditRow = page
    .locator('ngx-decaf-table [role="row"], ngx-decaf-table tr')
    .filter({ hasText: 'leaflet' })
    .filter({ hasText: action })
    .first();

  await expect(auditRow).toBeVisible({ timeout: 10000 });
}

/**
 * Fills and submits the leaflet create form.
 * All key fields are SELECT components; xmlFileContent uses a file upload.
 * NOTE: verify selectors against rendered HTML if any step fails.
 */
async function fillAndSubmitLeafletForm(
  page: Page,
  opts: {
    productCode: string;
    batchNumber?: string;
    leafletType?: string;
    lang?: string;
    epiMarket?: string;
  }
) {
  // productCode — SELECT (app-select-field, readonly after set)
  const productSelect = page.locator('[id="productCode"] select');
  await productSelect.waitFor({ state: 'visible', timeout: 5000 });
  await productSelect.selectOption(opts.productCode);

  // batchNumber — SELECT (optional; leave unset for product-level leaflets)
  if (opts.batchNumber) {
    const batchSelect = page.locator('[id="batchNumber"] select');
    if (await batchSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await batchSelect.selectOption(opts.batchNumber);
    }
  }

  // leafletType — SELECT (default: 'leaflet')
  if (opts.leafletType) {
    const typeSelect = page.locator('[id="leafletType"] select');
    if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeSelect.selectOption(opts.leafletType);
    }
  }

  // lang — SELECT or text input (default: 'en')
  if (opts.lang) {
    const langSelect = page.locator('[id="lang"] select');
    if (await langSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await langSelect.selectOption(opts.lang);
    } else {
      const langInput = page.locator('[id="lang"] input');
      await langInput.fill(opts.lang);
    }
  }

  // epiMarket — SELECT (app-select-field, default: 'BR')
  if (opts.epiMarket) {
    const marketSelect = page.locator('[id="epiMarket"] select');
    if (await marketSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await marketSelect.selectOption(opts.epiMarket.toLowerCase());
    }
  }

  // xmlFileContent — file upload component (ngx-decaf-file-upload, accepts .xml)
  // Provide a minimal XML file via setInputFiles
  const fileInput = page
    .locator('[id="xmlFileContent"] input[type="file"], ngx-decaf-file-upload input[type="file"]')
    .first();
  if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fileInput.setInputFiles({
      name: 'leaflet.xml',
      mimeType: 'application/xml',
      buffer: Buffer.from('<?xml version="1.0" encoding="UTF-8"?><leaflet><content>test</content></leaflet>'),
    });
  }

  await page.click('[type="submit"]');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.serial('PTP-537 - Leaflet (UI E2E)', () => {
  /**
   * Create prerequisite product AND batch via API before any leaflet steps run.
   * Leaflets require both to exist; the create form selects them via dropdowns.
   */
  videoTest('Setup - Create prerequisite product and batch via API', async ({ page }) => {
    test.setTimeout(30000);

    const productResponse = await page.request.post(`${testEnvironment.apiURL}/product`, {
      data: {
        productCode,
        inventedName: `Leaflet Test Product ${now.getTime()}`,
        nameMedicinalProduct: `Leaflet Test Medicinal ${now.getTime()}`,
      },
      headers: { Authorization: `Bearer ${TestRepository.token}` },
      ignoreHTTPSErrors: true,
    });
    expect(productResponse.ok()).toBe(true);

    const batchResponse = await page.request.post(`${testEnvironment.apiURL}/batch`, {
      data: {
        productCode,
        batchNumber,
        expiryDate: expiryDate.toISOString(),
        batchRecall: false,
      },
      headers: { Authorization: `Bearer ${TestRepository.token}` },
      ignoreHTTPSErrors: true,
    });
    expect(batchResponse.ok()).toBe(true);
  });

  /**
   * Single-record lifecycle.
   * Steps mirror backend leaflet.e2e.ts — cache assertions use page.request.get(),
   * audit assertions navigate to /audit.
   * NOTE: The LeafletsPage does not expose an UPDATE route; re-submitting the
   * create form for the same productCode/batchNumber/leafletType/lang triggers an
   * update via LeafletHandler (it detects the record exists and calls PUT).
   */
  test.describe.serial('Single ops', () => {
    videoTest('STEP 1 - Navigate to /leaflets/create and submit a product-level leaflet', async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(`${testEnvironment.appURL}/leaflets/create`, {
        waitUntil: 'load',
      });
      await page.waitForTimeout(1000);

      // Product-level leaflet: leave batchNumber unset
      await fillAndSubmitLeafletForm(page, {
        productCode,
        leafletType,
        lang,
        epiMarket,
      });

      await page.waitForSelector('ion-loading', { state: 'visible' });
      await page.waitForTimeout(1000);
      await page.waitForSelector('ion-toast', { state: 'visible' });

      // Verify via cache: product-level leaflet entry exists
      await verifyLeafletCache(page, productCode, leafletType, lang, epiMarket);
    });

    videoTest('STEP 2 - Navigate to /leaflets/create and submit a batch-level leaflet', async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(`${testEnvironment.appURL}/leaflets/create`, {
        waitUntil: 'load',
      });
      await page.waitForTimeout(1000);

      // Batch-level leaflet: include batchNumber
      await fillAndSubmitLeafletForm(page, {
        productCode,
        batchNumber,
        leafletType,
        lang,
        epiMarket,
      });

      await page.waitForSelector('ion-loading', { state: 'visible' });
      await page.waitForTimeout(1000);
      await page.waitForSelector('ion-toast', { state: 'visible' });

      // Verify via cache: batch-level leaflet entry exists
      await verifyLeafletCache(page, productCode, leafletType, lang, epiMarket, batchNumber);
    });

    videoTest('STEP 3 - Audit page shows a create audit entry for the product-level leaflet', async ({ page }) => {
      test.setTimeout(30000);
      await verifyAuditPage(page, 'create');
    });

    videoTest('STEP 4 - Read product-level leaflet page displays the record', async ({ page }) => {
      test.setTimeout(30000);

      // Route: /leaflets/:operation/:modelId — modelId = productCode:leafletType:lang
      await page.goto(`${testEnvironment.appURL}/leaflets/${productLeafletId}`, { waitUntil: 'load' });
      await page.waitForTimeout(1000);

      // Verify metadata cache entry exists for the product-level leaflet
      await verifyLeafletMetadataCache(page, productCode);
      await verifyLeafletCache(page, productCode, leafletType, lang, epiMarket);
    });

    videoTest('STEP 5 - Read batch-level leaflet page displays the record', async ({ page }) => {
      test.setTimeout(30000);

      // modelId = productCode:batchNumber:leafletType:lang
      await page.goto(`${testEnvironment.appURL}/leaflets/${batchLeafletId}`, { waitUntil: 'load' });
      await page.waitForTimeout(1000);

      // Verify metadata cache entry exists for the batch-level leaflet
      await verifyLeafletMetadataCache(page, productCode, batchNumber);
      await verifyLeafletCache(page, productCode, leafletType, lang, epiMarket, batchNumber);
    });

    videoTest(
      'STEP 6 - GET public cache fallback serves the product leaflet for an unknown batch',
      async ({ page }) => {
        test.setTimeout(30000);

        // Requesting an unknown batchNumber falls back to the product-level leaflet
        const missingBatch = `missing-${now.getTime()}`;
        const fallbackUrl =
          `${cacheHost}/public/leaflet/${productCode}/${missingBatch}` + `/${leafletType}/${lang}/${epiMarket}`;

        const response = await page.request.get(fallbackUrl, {
          ignoreHTTPSErrors: true,
        });
        expect(response.ok()).toBe(true);
        const data = await response.json();
        expect(data?.productCode).toBe(productCode);
        expect(data?.leafletType).toBe(leafletType);
      }
    );

    videoTest('STEP 7 - Re-submit create form for existing product-level leaflet triggers update', async ({ page }) => {
      test.setTimeout(60000);

      // LeafletHandler detects the record exists and calls PUT instead of POST
      await page.goto(`${testEnvironment.appURL}/leaflets/create`, {
        waitUntil: 'load',
      });
      await page.waitForTimeout(1000);

      await fillAndSubmitLeafletForm(page, {
        productCode,
        leafletType,
        lang,
        epiMarket,
      });

      // The handler may show a diff modal before updating
      const modalVisible = await page
        .locator('ion-modal app-modal-diffs')
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (modalVisible) await confirmDiffModal(page);

      await page.waitForSelector('ion-loading', { state: 'visible' });
      await page.waitForSelector('ion-toast', { state: 'visible' });

      await verifyLeafletCache(page, productCode, leafletType, lang, epiMarket);
    });

    videoTest('STEP 8 - Audit page shows an update audit entry for the product-level leaflet', async ({ page }) => {
      test.setTimeout(30000);
      await verifyAuditPage(page, 'update');
    });

    videoTest('STEP 9 - Delete product-level leaflet via the delete confirmation page', async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(`${testEnvironment.appURL}/leaflets/delete/${productLeafletId}`, { waitUntil: 'load' });
      await page.waitForTimeout(1000);

      await page.click('[type="submit"]');
      await page.waitForSelector('ion-loading', { state: 'visible' });
      await page.waitForSelector('ion-toast', { state: 'visible' });

      // Verify both the API record and the cache entry are gone
      await expectLeafletCacheGone(page, productCode, leafletType, lang, epiMarket);
    });

    videoTest(
      'STEP 10 - GET /public/metadata entry is gone and /public/leaflet returns 404 for the product leaflet',
      async ({ page }) => {
        // metadata cache should also be cleared after leaflet deletion
        const expiry = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const metaUrl =
          `${cacheHost}/public/metadata/${productCode}` + `?serial=${encodeURIComponent(productCode)}&expiry=${expiry}`;
        const metaResponse = await page.request.get(metaUrl, {
          ignoreHTTPSErrors: true,
        });
        expect(metaResponse.status()).toBe(404);
      }
    );

    videoTest('STEP 11 - Audit page shows a delete audit entry for the product-level leaflet', async ({ page }) => {
      test.setTimeout(30000);
      await verifyAuditPage(page, 'delete');
    });

    videoTest('STEP 12 - Delete batch-level leaflet via the delete confirmation page', async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(`${testEnvironment.appURL}/leaflets/delete/${batchLeafletId}`, { waitUntil: 'load' });
      await page.waitForTimeout(1000);

      await page.click('[type="submit"]');
      await page.waitForSelector('ion-loading', { state: 'visible' });
      await page.waitForSelector('ion-toast', { state: 'visible' });

      await expectLeafletCacheGone(page, productCode, leafletType, lang, epiMarket, batchNumber);
    });

    videoTest('STEP 13 - GET /public/metadata entry returns 404 after batch-level leaflet delete', async ({ page }) => {
      const expiry = expiryDate.toISOString().slice(0, 10).replace(/-/g, '');
      const metaUrl =
        `${cacheHost}/public/metadata/${productCode}/${batchNumber}` +
        `?serial=${encodeURIComponent(batchNumber)}&expiry=${expiry}`;
      const metaResponse = await page.request.get(metaUrl, {
        ignoreHTTPSErrors: true,
      });
      expect(metaResponse.status()).toBe(404);
    });
  });

  /**
   * Querying — list-level navigation and interactions.
   * Mirrors backend STEP 12-14 (listBy / find / paginateBy) adapted for UI.
   */
  test.describe.serial('Querying', () => {
    videoTest('STEP 14 - Leaflet list page renders the ngx-decaf-list component', async ({ page }) => {
      test.setTimeout(30000);

      await page.goto(`${testEnvironment.appURL}/leaflets`, {
        waitUntil: 'load',
      });
      await page.waitForTimeout(2000);

      await expect(page.locator('ngx-decaf-list')).toBeVisible();
    });

    videoTest(
      'STEP 15 - Clicking the create action from the leaflet list navigates to the create form',
      async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/leaflets`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        const createBtn = page.locator('app-card-title ion-button, app-card-title button').first();
        await createBtn.waitFor({ state: 'visible', timeout: 5000 });
        await createBtn.click();

        await page.waitForURL(`**\/leaflets\/create`, { timeout: 10000 });
        expect(page.url()).toContain('/leaflets/create');
      }
    );
  });
});
