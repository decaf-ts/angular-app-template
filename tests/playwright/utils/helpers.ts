import { Logger, Logging } from '@decaf-ts/logging';
import { Page } from '@playwright/test';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
dotenvExpand.expand(
  dotenv.config({
    path: [
      '../.env.secret',
      `../${process.env?.['ENV_CONTEXT'] ? `.env.${process.env?.['ENV_CONTEXT']}` : '.env.pdm'}`,
      '../.env',
    ],
  })
);

const apiURL = `${process.env['PTP__PROTOCOL'] || 'http'}://${process.env['PTP__HOST'] || 'localhost:3000'}`;
const appURL = apiURL.includes('localhost') ? `http://localhost:8130` : apiURL.replace(/backend/g, 'frontend');
export const routes = ['Products', 'Batches'];

export const testLogger = (function (): Logger {
  return Logging.for('PlaywrightTests');
})();

type TestEnvironment = { apiURL: string; appURL: string; videoMode: boolean };

export const testEnvironment: TestEnvironment = {
  apiURL,
  appURL,
  videoMode: process.env['PTP__VIDEO_MODE'] !== 'false',
};

export async function getTestEnvironment(page: Page): Promise<TestEnvironment> {
  if (testEnvironment) {
    return testEnvironment;
  }
  const windowEnv = await page.evaluate(() => (window as any)?.['ENV']);
  const appURL = `${windowEnv.ptp.protocol}://${windowEnv.ptp.host}`;
  return {
    apiURL,
    videoMode: false,
    appURL: appURL.includes('localhost') ? `http://localhost:8130` : appURL.replace(/backend/g, 'frontend'),
  };
}

function calculateGtinCheckSum(digits: string): string {
  digits = '' + digits;
  if (digits.length !== 13) throw new Error('needs to received 13 digits');
  const multiplier = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];
  let sum = 0;
  try {
    // multiply each digit for its multiplier according to the table
    for (let i = 0; i < 13; i++) sum += parseInt(digits.charAt(i)) * multiplier[i];

    // Find the nearest equal or higher multiple of ten
    const remainder = sum % 10;
    let nearest;
    if (remainder === 0) nearest = sum;
    else nearest = sum - remainder + 10;

    return nearest - sum + '';
  } catch (e) {
    throw new Error(`Did this received numbers? ${e}`);
  }
}
