import { expect, Page } from '@playwright/test';
import { getTestEnvironment, testEnvironment, testLogger } from './utils/helpers';

type UserCredentials = {
  username: string;
  password: string;
};
export const userCredentials: UserCredentials = {
  username: 'test-user',
  password: 'test123',
  // username: env?.['KEYCLOAK__ADMIN_API_USERNAME'] ?? 'test-user',
  // password: env?.['KEYCLOAK__ADMIN_API_PASSWORD'] ?? 'test123',
};

export let authToken: string | undefined;
export async function apiAuthorization(page: Page): Promise<string | undefined> {
  try {
    if (authToken) {
      return authToken;
    }
    const response = await page.request.get(`${testEnvironment.apiURL}/auth/login`, {
      headers: { Accept: 'application/json' },
    });
    if (response.ok()) {
      const { token } = await response.json();
      return token;
    }
    return undefined;
  } catch (error) {}
  return undefined;
}

export async function keycloakAuthorization(page: Page, userData: UserCredentials): Promise<string> {
  const { apiURL } = await getTestEnvironment(page);
  // const context = await page.context();
  await page.goto(`${apiURL}/auth/login`, {
    waitUntil: 'load',
  });
  try {
    const { username, password } = userData;
    await page.waitForSelector('input[name="username"]', { state: 'visible' });
    await page.waitForSelector('input[name="password"]', { state: 'visible' });
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await Promise.all([await page.waitForURL('**/*'), await page.click('#kc-login')]);
    await page.waitForLoadState('networkidle');

    // const cookies = await context.cookies();
    await page.goto(`${apiURL}/auth/login`, {
      waitUntil: 'load',
    });
    const response = await page.request.get(`${apiURL}/auth/login`, {
      headers: { Accept: 'application/json' },
    });

    expect(response).toBeOK();

    const { token } = await response.json();
    return token;
  } catch (error) {
    const message = `Keycloak LOGIN Failed: ${(error as Error)?.message || error}`;
    testLogger.error(message);
    throw new Error(message);
  }

  // await Promise.all([
  //   await page.waitForURL('**/*'),
  //   await page.click('#social-pla_oidc'),
  // ]);

  // await page.waitForLoadState('networkidle');
  //   await page.waitForSelector('input[name="loginfmt"]', { state: 'visible' });
  // await page.fill('input[name="loginfmt"]', userData.username);
}

export async function getAuthorizationToken(
  page: Page,
  userData: {
    username: string;
    password: string;
  }
): Promise<string | void> {
  const { appURL } = await getTestEnvironment(page);

  try {
    await page.goto(`${appURL}/login`);
    authToken = await apiAuthorization(page);
    if (!authToken) {
      authToken = await keycloakAuthorization(page, userData);
    }
    authToken = authToken.split('Bearer ')[1];
    expect(authToken).toBeDefined();
    expect(typeof authToken).toBe('string');
    expect(authToken).not.toContain('Bearer ');
    return authToken;
  } catch (error) {
    const message = `LOGIN Failed: ${(error as Error)?.message || error}. Credentials: ${JSON.stringify(userData)}`;
    testLogger.error(message);
    testLogger.error(
      `Ensure angular application is running and accessible at ${appURL}, and that the credentials are correct.`
    );
    process.exit(1);
  }
}

// test.describe('Authentication Test', () => {
//   videoTest('Must Login', async ({ page }) => {
//     const token = await getAuthorizationToken(page, {
//       username: 'test-user',
//       password: 'test-123',
//     });

//     expect(token).toBeDefined();
//     expect(token).not.toContain('Bearer ');

//     await page.goto(`${appBaseUrl}/dashboard`);

//     expect(page).toHaveURL(/dashboard/);

//     await (1000);
//   });
// });
