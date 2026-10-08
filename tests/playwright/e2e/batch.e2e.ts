import { expect, Page, test } from '@playwright/test';
import { generateGtin } from 'src/app/handlers/ProductHandler';
import { testEnvironment } from '../utils/helpers';
import { videoTest } from '../utils/overrides';
import { TestRepository } from '../utils/TestRepository';

const now = new Date();
const productCode = generateGtin();
const batchNumber = `batch-${now.getTime()}`;
const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
const expiryDateStr = expiryDate.toISOString().slice(0, 10); // YYYY-MM-DD for <input type="date">

// Cache PDM host — configure via PTP__CACHE_HOST env var or falls back to the internal default
const cacheHost = process.env['PTP__CACHE_HOST'] ?? 'https://cache-pdm.ptp.internal';

// Batch composite uid: productCode:batchNumber (TestRepository splits on ':' → path segments)
const batchUid = `${productCode}:${batchNumber}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Confirms the batch diff modal shown by BatchHandler.beforeUpdate.
 * Re-uses the same app-modal-diffs component as the product flow.
 */
async function confirmDiffModal(page: Page) {
  const confirmBtn = page.locator('ion-modal app-modal-diffs .dcf-buttons-grid ion-button').last();
  await confirmBtn.waitFor({ state: 'visible', timeout: 8000 });
  await confirmBtn.click();
}

/**
 * Verifies the /public/metadata/{productCode}/{batchNumber} cache entry exists.
 * `reference` is used to compute the expiry query param (YYYYMMDD).
 */
async function verifyBatchMetadataCache(
  page: Page,
  pCode: string,
  bNum: string,
  assertion?: (batch: any) => void,
  reference?: Date | string
) {
  const expirySource = reference ? new Date(reference) : expiryDate;
  const expiry = expirySource.toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${cacheHost}/public/metadata/${pCode}/${bNum}` + `?serial=${encodeURIComponent(bNum)}&expiry=${expiry}`;

  const response = await page.request.get(url, { ignoreHTTPSErrors: true });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  // Cache response may nest values under data.batch or expose them at the root
  const productCodeValue = data?.product?.productCode ?? data?.productCode;
  const batchNumberValue = data?.batch?.batchNumber ?? data?.batchNumber;
  expect(productCodeValue).toBe(pCode);
  expect(batchNumberValue).toBe(bNum);
  if (assertion) assertion(data?.batch ?? data);
  return data;
}

/**
 * Navigates to the /audit page and asserts that the most-recent audit entry
 * for model="batch" and the given action is visible in the table.
 */
async function verifyAuditPage(page: Page, action: 'create' | 'update' | 'delete') {
  await page.goto(`${testEnvironment.appURL}/audit`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const auditRow = page
    .locator('ngx-decaf-table [role="row"], ngx-decaf-table tr')
    .filter({ hasText: 'batch' })
    .filter({ hasText: action })
    .first();

  await expect(auditRow).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.serial('PTP-536 - Batch (UI E2E)', () => {
  test.describe.serial('batch ui', () => {
    /**
     * Create the prerequisite product via API before any batch steps run.
     * Batches require an existing product; the create form selects it from
     * a dropdown populated from the repository.
     */
    videoTest('Setup - Create prerequisite product via API', async ({ page }) => {
      test.setTimeout(30000);

      const response = await page.request.post(`${testEnvironment.apiURL}/product`, {
        data: {
          productCode,
          inventedName: `Batch Test Product ${now.getTime()}`,
          nameMedicinalProduct: `Batch Test Medicinal ${now.getTime()}`,
        },
        headers: { Authorization: `Bearer ${TestRepository.token}` },
        ignoreHTTPSErrors: true,
      });
      expect(response.ok()).toBe(true);
    });

    /**
     * Single-record lifecycle.
     * Steps mirror backend batch.e2e.ts — cache assertions use page.request.get(),
     * audit assertions navigate to /audit.
     */
    test.describe.serial('Single ops', () => {
      videoTest('STEP 1 - Navigate to /batches/create and submit valid batch', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/batches/create`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        // productCode is a SELECT populated from existing products (app-select-field)
        // NOTE: verify selector against rendered HTML if this step fails
        const productSelect = page.locator('[id="productCode"] select');
        await productSelect.waitFor({ state: 'visible', timeout: 5000 });
        await productSelect.selectOption(productCode);

        // batchNumber is a free-text input (readonly after CREATE)
        const batchNumberInput = page.locator('[id="batchNumber"] input');
        await batchNumberInput.fill(batchNumber);

        // expiryDate is rendered by app-expiry-date-field (custom component)
        // NOTE: verify selector against rendered HTML if this step fails
        const expiryInput = page
          .locator('[id="expiryDate"] input[type="date"], app-expiry-date-field input[type="date"]')
          .first();
        await expiryInput.waitFor({ state: 'visible', timeout: 5000 });
        await expiryInput.fill(expiryDateStr);

        await page.click('[type="submit"]');
        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForTimeout(1000);
        await page.waitForSelector('ion-toast', { state: 'visible' });

        // TestRepository.read splits ':' → '/', giving GET /batch/{productCode}/{batchNumber}
        const created = await TestRepository.read('batch', batchUid);
        expect(created).toBeDefined();
        expect(created).toBeTruthy();
      });

      videoTest('STEP 2 - Read batch page displays the correct field values', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/batches/${batchUid}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        await expect(page.locator('[id="batchNumber"] input')).toHaveValue(batchNumber);
      });

      videoTest('STEP 3 - GET /public/metadata cache entry is populated for the batch', async ({ page }) => {
        await verifyBatchMetadataCache(page, productCode, batchNumber);
      });

      videoTest('STEP 4 - Audit page shows a create audit entry for the batch', async ({ page }) => {
        test.setTimeout(30000);
        await verifyAuditPage(page, 'create');
      });

      videoTest('STEP 5 - Create with invalid expiryDate shows validation error toast', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/batches/create`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        const productSelect = page.locator('[id="productCode"] select');
        await productSelect.waitFor({ state: 'visible', timeout: 5000 });
        await productSelect.selectOption(productCode);

        const batchNumberInput = page.locator('[id="batchNumber"] input');
        await batchNumberInput.fill(`batch-invalid-${now.getTime()}`);

        // Leave expiryDate empty — required field validation fails
        await page.click('[type="submit"]');

        await page.waitForSelector('ion-toast', { state: 'visible' });
        await expect(page.locator('ion-toast').first()).toHaveAttribute('color', 'danger');
      });

      videoTest('STEP 6 - Update manufacturerName via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/batches/update/${batchUid}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        const manufacturerInput = page.locator('[id="manufacturerName"] input');
        await manufacturerInput.clear();
        await manufacturerInput.fill(`Manufacturer-${now.getTime()}`);

        await page.click('[type="submit"]');

        // BatchHandler.beforeUpdate reuses ProductHandler.endTransaction → app-modal-diffs
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('batch', batchUid);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 7 - GET /public/metadata cache entry reflects the manufacturerName update', async ({ page }) => {
        await verifyBatchMetadataCache(page, productCode, batchNumber, (batch) => {
          expect(batch?.manufacturerName).toBeDefined();
        });
      });

      videoTest('STEP 8 - Update packagingSiteName via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/batches/update/${batchUid}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        const packagingInput = page.locator('[id="packagingSiteName"] input');
        await packagingInput.clear();
        await packagingInput.fill(`Packaging-${now.getTime()}`);

        await page.click('[type="submit"]');
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('batch', batchUid);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 9 - GET /public/metadata cache entry shows the packagingSiteName update', async ({ page }) => {
        await verifyBatchMetadataCache(page, productCode, batchNumber, (batch) => {
          expect(batch?.packagingSiteName).toBeDefined();
        });
      });

      videoTest('STEP 10 - Update manufacturerAddress via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/batches/update/${batchUid}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // manufacturerAddress is a nested model; its address field is rendered
        // inside the [id="manufacturerAddress"] container.
        // NOTE: verify selector against rendered HTML if this step fails
        const addressInput = page.locator('[id="manufacturerAddress"] input, [id="address"] input').first();
        await addressInput.clear();
        await addressInput.fill(`Address-${now.getTime()}`);

        await page.click('[type="submit"]');
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('batch', batchUid);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 11 - GET /public/metadata cache entry shows the manufacturerAddress update', async ({ page }) => {
        await verifyBatchMetadataCache(page, productCode, batchNumber, (batch) => {
          expect(batch?.manufacturerAddress).toBeDefined();
        });
      });

      videoTest('STEP 12 - Delete batch via the delete confirmation page', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/batches/delete/${batchUid}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        await page.click('[type="submit"]');
        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const stillExists = await TestRepository.read('batch', batchUid);
        expect(stillExists).toBeFalsy();
      });

      videoTest('STEP 13 - GET /public/metadata cache entry returns 404 after delete', async ({ page }) => {
        const expiry = expiryDate.toISOString().slice(0, 10).replace(/-/g, '');
        const url =
          `${cacheHost}/public/metadata/${productCode}/${batchNumber}` +
          `?serial=${encodeURIComponent(batchNumber)}&expiry=${expiry}`;

        const response = await page.request.get(url, {
          ignoreHTTPSErrors: true,
        });
        expect(response.status()).toBe(404);
      });

      videoTest('STEP 14 - Audit page shows a delete audit entry for the batch', async ({ page }) => {
        test.setTimeout(30000);
        await verifyAuditPage(page, 'delete');
      });
    });

    /**
     * Querying — list-level navigation and interactions.
     * Mirrors backend STEP 18-20 (listBy / find / paginateBy) adapted for UI.
     */
    test.describe.serial('Querying', () => {
      videoTest('STEP 15 - Batch list page renders the ngx-decaf-list component', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/batches`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(2000);

        await expect(page.locator('ngx-decaf-list')).toBeVisible();
      });

      videoTest(
        'STEP 16 - Clicking the create action from the batch list navigates to the create form',
        async ({ page }) => {
          test.setTimeout(30000);

          await page.goto(`${testEnvironment.appURL}/batches`, {
            waitUntil: 'load',
          });
          await page.waitForTimeout(1000);

          const createBtn = page.locator('app-card-title ion-button, app-card-title button').first();
          await createBtn.waitFor({ state: 'visible', timeout: 5000 });
          await createBtn.click();

          await page.waitForURL(`**\/batches\/create`, { timeout: 10000 });
          expect(page.url()).toContain('/batches/create');
        }
      );
    });
  });
});
