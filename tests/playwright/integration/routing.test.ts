import { expect, test } from '@playwright/test';
import { getAuthorizationToken, userCredentials } from '../login.spec';
import { routes, testEnvironment } from '../utils/helpers';
import { videoTest } from '../utils/overrides';

const { appURL } = testEnvironment;

// Optional: video test always call auth method when skiptAuth is false, so we can test the auth flow in a dedicated test
test.describe('Authentication Test', () => {
  videoTest.use({ skipAuth: true });
  videoTest('Must generate token', async ({ page }) => {
    const token = await getAuthorizationToken(page, userCredentials);

    expect(token).toBeDefined();
    expect(token).not.toContain('Bearer ');
    await page.goto(`${appURL}/dashboard`);
  });
});

for (const route of routes) {
  test.describe(`Testing ${route}`, () => {
    videoTest(`${route} - Navigate to page`, async ({ page }) => {
      await page.goto(`${appURL}/${route.toLowerCase()}`, {
        waitUntil: 'load',
      });
      expect(page).toHaveURL(new RegExp(route.toLowerCase()));

      await page.waitForTimeout(1000);
    });
  });
}
