import { Page } from '@playwright/test';
import { testEnvironment, testLogger } from './helpers';
import { sharedStorageState } from './overrides';

export class TestRepository {
  static page: Page;

  static token: string;

  static async fillAndSubmit(data: Record<string, unknown>, pk: string): Promise<string> {
    for (const [key, value] of Object.entries(data)) {
      const input = this.page.locator(`[id="${key}"] input`);
      if (input) {
        await input.fill(value as string);
      }
    }
    await this.page.click('[type="submit"]');
    return data[pk] as string;
  }

  static async read(modelName: string, uid: string): Promise<boolean> {
    try {
      this.page.context().addCookies(sharedStorageState?.cookies || []);
      const response = await this.page.request.get(
        `${testEnvironment.apiURL}/${modelName}/${uid.split(':').join('/')}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${TestRepository.token}`,
          },
        }
      );
      return response.ok();
    } catch (error) {
      testLogger.error(`Error reading product: ${modelName}/${uid} ${(error as Error)?.message || String(error)}`);
      return false;
    }
  }
}
