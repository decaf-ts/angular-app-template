import { Product } from '@pharmaledgerassoc/ptp-toolkit/shared';
import { expect, test } from '@playwright/test';
import { generateGtin } from 'src/app/handlers/ProductHandler';
import { testEnvironment } from '../utils/helpers';
import { videoTest } from '../utils/overrides';
import { TestRepository } from '../utils/TestRepository';

const now = new Date();
const gtin = generateGtin();
const routes = [
  {
    model: 'Product',
    route: 'products',
    pk: 'productCode',
    data: {
      nameMedicinalProduct: `Test Product ${now.getTime()}`,
      inventedName: `Test Product ${now.getTime()}`,
      productCode: gtin,
    } as Partial<Product>,
  },
  // {
  //   model: 'Batch',
  //   route: 'batches',
  //   pk: 'id',
  //   data: {
  //     id: `${gtin}:${now.getTime()}`,
  //     productCode: gtin,
  //     expiryDate: now,
  //   } as Partial<Product>,
  // },
];

// test.describe('Authentication Test', () => {
//   videoTest.use({ skipAuth: true });
//   videoTest('Must generate token', async ({ context, page }) => {
//     const token = (await getAuthorizationToken(page, userCredentials)) as string;
//     await page.goto(`${testEnvironment.appURL}/dashboard`, {
//       waitUntil: 'networkidle',
//     });
//     expect(token).toBeDefined();
//     expect(token).not.toContain('Bearer ');
//   });
// });

for (const { data, route, model, pk } of routes) {
  let uid: string;
  test.describe(`Testing ${model}`, () => {
    videoTest(`Creating ${model}`, async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(`${testEnvironment.appURL}/${route}/create`, {
        waitUntil: 'load',
      });
      await page.waitForTimeout(1000);
      uid = await TestRepository.fillAndSubmit(data, pk);
      await page.waitForSelector('ion-loading', { state: 'visible' });

      await page.waitForTimeout(1000);
      await page.waitForSelector('ion-toast', { state: 'visible' });
      const created = await TestRepository.read(model, uid);
      expect(created).toBeDefined();
      expect(created).toBeTruthy();
    });

    videoTest(`Reading last created ${model}`, async ({ page }) => {
      await page.goto(`${testEnvironment.appURL}/${route}/${uid}`, {
        waitUntil: 'load',
      });
      // expect(created).toBeDefined();
      // expect(created).toBeTruthy();
    });
  });
}
