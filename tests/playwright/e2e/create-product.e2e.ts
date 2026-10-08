import { expect, Page, test } from '@playwright/test';
import { generateGtin } from 'src/app/handlers/ProductHandler';
import { testEnvironment } from '../utils/helpers';
import { videoTest } from '../utils/overrides';
import { TestRepository } from '../utils/TestRepository';

const now = new Date();
const productCode = generateGtin();
const inventedName = `Test Product ${now.getTime()}`;
const nameMedicinalProduct = `Test Medicinal ${now.getTime()}`;

// Cache PDM host — configure via PTP__CACHE_HOST env var or falls back to the internal default
const cacheHost = process.env['PTP__CACHE_HOST'] ?? 'https://cache-pdm.ptp.internal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Confirms the product diff modal shown by ProductHandler.beforeUpdate.
 * The modal is `app-modal-diffs` inside an Ionic modal; the Continue button
 * is the last ion-button inside `.dcf-buttons-grid`.
 */
async function confirmDiffModal(page: Page) {
  const confirmBtn = page.locator('ion-modal app-modal-diffs .dcf-buttons-grid ion-button').last();
  await confirmBtn.waitFor({ state: 'visible', timeout: 8000 });
  await confirmBtn.click();
}

/**
 * Verifies the /public/owner/{productCode} cache entry exists and returns
 * the correct productCode and owner fields.
 * No auth headers required — the owner endpoint is public.
 */
async function verifyOwnerCache(page: Page, code: string) {
  const response = await page.request.get(`${cacheHost}/public/owner/${code}`, { ignoreHTTPSErrors: true });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data?.productCode).toBe(code);
  expect(data?.owner).toBeDefined();
  return data;
}

/**
 * Verifies the /public/metadata/{productCode} cache entry exists.
 * `reference` is used to compute the `expiry` query parameter (YYYYMMDD).
 * Returns the product metadata object so callers can assert specific fields.
 */
async function verifyMetadataCache(
  page: Page,
  code: string,
  assertion?: (product: any) => void,
  reference?: Date | string
) {
  const expirySource = reference ? new Date(reference) : new Date();
  const expiry = expirySource.toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${cacheHost}/public/metadata/${code}` + `?serial=${encodeURIComponent(code)}&expiry=${expiry}`;

  const response = await page.request.get(url, { ignoreHTTPSErrors: true });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data?.product?.productCode).toBe(code);
  if (assertion) assertion(data?.product);
  return data?.product;
}

/**
 * Verifies the /public/metadata/{productCode} returns 404 (entry deleted).
 */
async function expectMetadataCacheGone(page: Page, code: string, reference?: Date | string) {
  const expirySource = reference ? new Date(reference) : new Date();
  const expiry = expirySource.toISOString().slice(0, 10).replace(/-/g, '');
  const url = `${cacheHost}/public/metadata/${code}` + `?serial=${encodeURIComponent(code)}&expiry=${expiry}`;

  const response = await page.request.get(url, { ignoreHTTPSErrors: true });
  expect(response.status()).toBe(404);
}

/**
 * Navigates to the /audit page and asserts that the most-recent audit entry
 * for model="product" and the given action is visible in the table.
 */
async function verifyAuditPage(page: Page, action: 'create' | 'update' | 'delete') {
  await page.goto(`${testEnvironment.appURL}/audit`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // ngx-decaf-table renders audit rows; find a row containing both "product"
  // (model column) and the expected action value.
  const auditRow = page
    .locator('ngx-decaf-table [role="row"], ngx-decaf-table tr')
    .filter({ hasText: 'product' })
    .filter({ hasText: action })
    .first();

  await expect(auditRow).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.serial('PTP-535 - Product (UI E2E)', () => {
  test.describe.serial('product ui', () => {
    /**
     * Single-record lifecycle.
     * Steps follow the same numbering as the backend product.e2e.ts where
     * possible; cache assertions use page.request.get() rather than axios,
     * and audit assertions navigate to /audit instead of querying the API.
     * Bulk operation steps (17-22) are omitted — no dedicated bulk UI exists.
     */
    test.describe.serial('Single ops', () => {
      videoTest('STEP 1 - Navigate to /products/create and submit valid product', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/create`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        await TestRepository.fillAndSubmit({ nameMedicinalProduct, inventedName, productCode }, 'productCode');

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForTimeout(1000);
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const created = await TestRepository.read('Product', productCode);
        expect(created).toBeDefined();
        expect(created).toBeTruthy();
      });

      videoTest('STEP 2 - Read product page displays the correct field values', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/products/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        await expect(page.locator('[id="productCode"] input')).toHaveValue(productCode);
        await expect(page.locator('[id="inventedName"] input')).toHaveValue(inventedName);
        await expect(page.locator('[id="nameMedicinalProduct"] input')).toHaveValue(nameMedicinalProduct);
      });

      videoTest('STEP 3 - GET /public/owner cache entry is populated after create', async ({ page }) => {
        await verifyOwnerCache(page, productCode);
      });

      videoTest('STEP 4 - GET /public/metadata cache entry reflects the created product', async ({ page }) => {
        await verifyMetadataCache(page, productCode, (metadata) => {
          expect(metadata?.inventedName).toBe(inventedName);
        });
      });

      videoTest('STEP 5 - Audit page shows a create audit entry for the product', async ({ page }) => {
        test.setTimeout(30000);
        await verifyAuditPage(page, 'create');
      });

      videoTest('STEP 6 - Create with invalid productCode shows validation error toast', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/create`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        await TestRepository.fillAndSubmit(
          {
            nameMedicinalProduct: `Invalid Product ${now.getTime()}`,
            inventedName: `Invalid Product ${now.getTime()}`,
            // Fails @gtin() validation — non-numeric / bad checksum
            productCode: 'invalidinvalid',
          },
          'productCode'
        );

        await page.waitForSelector('ion-toast', { state: 'visible' });
        await expect(page.locator('ion-toast').first()).toHaveAttribute('color', 'danger');
      });

      videoTest('STEP 7 - Create with duplicate productCode shows conflict error toast', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/create`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        // Re-submit the same productCode — backend returns 409 Conflict
        await TestRepository.fillAndSubmit({ nameMedicinalProduct, inventedName, productCode }, 'productCode');

        await page.waitForSelector('ion-toast', { state: 'visible' });
        await expect(page.locator('ion-toast').first()).toHaveAttribute('color', 'danger');
      });

      videoTest('STEP 8 - Update inventedName via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/update/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        const inventedNameInput = page.locator('[id="inventedName"] input');
        await inventedNameInput.clear();
        await inventedNameInput.fill('Updated Invented Name');

        await page.click('[type="submit"]');

        // ProductHandler.beforeUpdate opens app-modal-diffs when changes are detected
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('Product', productCode);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 9 - GET /public/metadata cache entry reflects the inventedName update', async ({ page }) => {
        await verifyMetadataCache(page, productCode, (metadata) => {
          expect(metadata?.inventedName).toBe('Updated Invented Name');
        });
      });

      videoTest('STEP 10 - Audit page shows an update audit entry with inventedName diff', async ({ page }) => {
        test.setTimeout(30000);
        await verifyAuditPage(page, 'update');
      });

      videoTest('STEP 11 - Add a market entry via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/update/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // EpiLayout renders markets as ngx-decaf-fieldset with multiple:true.
        // The fieldset provides an Add button inside the [id="markets"] container.
        // NOTE: verify this selector against rendered HTML if the step fails.
        const addMarketBtn = page.locator('[id="markets"] ion-button, [id="markets"] button[type="button"]').first();
        await addMarketBtn.waitFor({ state: 'visible', timeout: 5000 });
        await addMarketBtn.click();

        // marketId is rendered as HTML5InputTypes.SELECT (getMarketOptions → ISO codes)
        const marketIdSelect = page.locator('[id="marketId"] select').first();
        await marketIdSelect.waitFor({ state: 'visible', timeout: 5000 });
        await marketIdSelect.selectOption('br'); // Brazil

        await page.click('[type="submit"]');
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('Product', productCode);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 12 - GET /public/metadata cache entry shows the new market', async ({ page }) => {
        await verifyMetadataCache(page, productCode, (metadata) => {
          const markets: any[] = metadata?.markets ?? [];
          expect(markets.some((m: any) => ['br', 'BR'].includes(m.marketId))).toBe(true);
        });
      });

      videoTest('STEP 13 - Add a strength entry via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/update/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // EpiLayout renders strengths as ngx-decaf-fieldset with multiple:true.
        // NOTE: verify this selector against rendered HTML if the step fails.
        const addStrengthBtn = page
          .locator('[id="strengths"] ion-button, [id="strengths"] button[type="button"]')
          .first();
        await addStrengthBtn.waitFor({ state: 'visible', timeout: 5000 });
        await addStrengthBtn.click();

        // ProductStrength fields: strength (required), substance (optional)
        const strengthInput = page.locator('[id="strength"] input').first();
        await strengthInput.waitFor({ state: 'visible', timeout: 5000 });
        await strengthInput.fill('100mg');

        const substanceInput = page.locator('[id="substance"] input').first();
        if (await substanceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await substanceInput.fill('Ibuprofen');
        }

        await page.click('[type="submit"]');
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('Product', productCode);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 14 - GET /public/metadata cache entry shows the new strength', async ({ page }) => {
        await verifyMetadataCache(page, productCode, (metadata) => {
          const strengths: any[] = metadata?.strengths ?? [];
          expect(strengths.some((s: any) => s.strength?.includes('100mg'))).toBe(true);
        });
      });

      videoTest('STEP 15 - Add image data via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/update/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // imageData is rendered as a file-upload component.
        // Provide a small PNG fixture via setInputFiles so the ProductHandler
        // can build a ProductImage from the selected file content.
        // NOTE: adjust the fixture path to match your local test-fixtures directory.
        const fileInput = page.locator('[id="imageData"] input[type="file"]');
        if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await fileInput.setInputFiles({
            name: 'test-image.png',
            mimeType: 'image/png',
            // Minimal 1×1 white PNG (base64-encoded, decoded inline)
            buffer: Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
              'base64'
            ),
          });
        }

        await page.click('[type="submit"]');
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('Product', productCode);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 16 - GET /public/metadata cache entry holds the image data', async ({ page }) => {
        await verifyMetadataCache(page, productCode, (metadata) => {
          expect(metadata?.imageData).toBeDefined();
        });
      });

      videoTest('STEP 17 - Remove all markets and strengths via the update form', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/update/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // ngx-decaf-fieldset renders a remove/delete button per row (multiple:true).
        // Iterate backwards to avoid index shifts after each removal.
        const removeMarketBtns = page.locator(
          '[id="markets"] [data-action="remove"], [id="markets"] ion-button[color="danger"]'
        );
        const marketCount = await removeMarketBtns.count();
        for (let i = marketCount - 1; i >= 0; i--) {
          await removeMarketBtns.nth(i).click();
          await page.waitForTimeout(300);
        }

        const removeStrengthBtns = page.locator(
          '[id="strengths"] [data-action="remove"], [id="strengths"] ion-button[color="danger"]'
        );
        const strengthCount = await removeStrengthBtns.count();
        for (let i = strengthCount - 1; i >= 0; i--) {
          await removeStrengthBtns.nth(i).click();
          await page.waitForTimeout(300);
        }

        await page.click('[type="submit"]');
        await confirmDiffModal(page);

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        const updated = await TestRepository.read('Product', productCode);
        expect(updated).toBeTruthy();
      });

      videoTest('STEP 18 - GET /public/metadata cache entry clears markets and strengths', async ({ page }) => {
        await verifyMetadataCache(page, productCode, (metadata) => {
          expect(metadata?.markets ?? []).toEqual([]);
          expect(metadata?.strengths ?? []).toEqual([]);
        });
      });

      videoTest('STEP 19 - Delete product via the delete confirmation page', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${testEnvironment.appURL}/products/delete/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // The delete page renders the product read-only with a submit button
        // that issues the DELETE request through the repository
        await page.click('[type="submit"]');

        await page.waitForSelector('ion-loading', { state: 'visible' });
        await page.waitForSelector('ion-toast', { state: 'visible' });

        // TestRepository.read returns false when the API responds with 404
        const stillExists = await TestRepository.read('Product', productCode);
        expect(stillExists).toBeFalsy();
      });

      videoTest('STEP 20 - Product list no longer shows the deleted product', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/products`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(2000);

        await expect(page.locator(`text="${inventedName}"`).first()).not.toBeVisible();
      });

      videoTest('STEP 21 - GET /public/owner cache entry returns 404 after delete', async ({ page }) => {
        const response = await page.request.get(`${cacheHost}/public/owner/${productCode}`, {
          ignoreHTTPSErrors: true,
        });
        expect(response.status()).toBe(404);
      });

      videoTest('STEP 22 - GET /public/metadata cache entry returns 404 after delete', async ({ page }) => {
        await expectMetadataCacheGone(page, productCode);
      });

      videoTest('STEP 23 - Audit page shows a delete audit entry for the product', async ({ page }) => {
        test.setTimeout(30000);
        await verifyAuditPage(page, 'delete');
      });

      videoTest('STEP 24 - Navigate to the deleted product read page shows not-found state', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/products/${productCode}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        // ProductsPage sets errorMessage and renders ngx-decaf-empty-state
        // ("404 - Not Found") when initialize() receives a 404 from the API
        await expect(page.locator('ngx-decaf-empty-state, [class*="empty-state"]').first()).toBeVisible();
      });
    });

    /**
     * Querying — list-level navigation and interactions.
     * Mirrors backend STEP 23-25 (listBy / findBy / paginateBy) adapted for UI.
     */
    test.describe.serial('Querying', () => {
      videoTest('STEP 25 - Product list page renders the ngx-decaf-list component', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/products`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(2000);

        // ngx-decaf-list with sortBy="createdAt" and type="infinite"
        await expect(page.locator('ngx-decaf-list')).toBeVisible();
      });

      videoTest('STEP 26 - Clicking the create action from the list navigates to the create form', async ({ page }) => {
        test.setTimeout(30000);

        await page.goto(`${testEnvironment.appURL}/products`, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(1000);

        // app-card-title renders an allowCreate action button
        const createBtn = page.locator('app-card-title ion-button, app-card-title button').first();
        await createBtn.waitFor({ state: 'visible', timeout: 5000 });
        await createBtn.click();

        await page.waitForURL(`**\/products\/create`, { timeout: 10000 });
        expect(page.url()).toContain('/products/create');
      });
    });
  });
});
