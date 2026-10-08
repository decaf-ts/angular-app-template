import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { StoryboardRunner } from '../utils/storyboard';
import { storyboard } from '../storyboards';

/**
 * Storyboard screenshot / user-guide generator.
 *
 * This test is project-agnostic: it only reads the active `storyboard`
 * configuration and hands the page to {@link StoryboardRunner}. To reuse it for
 * another UI project, point `../storyboards` at that project's scenario file --
 * no change is required here.
 *
 * Naming deviation from task1: the LWA copy is `storyboard.e2e.ts` because the
 * LWA `playwright.config.ts` declares a `testMatch` that includes `.e2e.ts`. The
 * ew-frontend config declares no `testMatch`, so Playwright's default only
 * discovers `.spec.ts` and `.test.ts` files. This file is therefore named
 * `storyboard.test.ts` so the existing config picks it up without editing
 * `playwright.config.ts` (outside the task mutation scope). Behavior is otherwise
 * identical to the task1 tool.
 */
test.describe.configure({ mode: 'serial', timeout: 1800000 });

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readPngSize = (file: string): { width: number; height: number } => {
  const header = readFileSync(file).subarray(0, 24);
  if (!header.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file} is not a PNG file`);
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
};

test('storyboard: capture screenshots and generate the user guide', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL as string | undefined;
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: storyboard.viewport ?? { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    const runner = new StoryboardRunner(storyboard);
    const results = await runner.runWithPage(page, baseURL);

    const captured = results.reduce((total, result) => total + result.aggregated.successCount, 0);
    const failures = results.reduce((total, result) => total + result.aggregated.failureCount, 0);

    expect(failures, `${failures} storyboard scenario(s) failed`).toBe(0);
    expect(captured).toBe(storyboard.scenarios.length);

    const screenshotsDir = path.resolve(process.cwd(), storyboard.screenshotsDir);
    const guideFile = path.resolve(process.cwd(), storyboard.guideFile);
    const guide = readFileSync(guideFile, 'utf8');
    const desktopWidth = (storyboard.viewport ?? { width: 1440 }).width;
    const nonDesktop: string[] = [];
    const missingInGuide: string[] = [];
    const expected = new Set(storyboard.scenarios.map((scenario) => `${scenario.id}.png`));

    for (const scenario of storyboard.scenarios) {
      const file = path.join(screenshotsDir, `${scenario.id}.png`);
      const { width, height } = readPngSize(file);
      if (width < 1024 || width < height || width !== desktopWidth) {
        nonDesktop.push(`${scenario.id} (${width}x${height})`);
      }
      if (!guide.includes(`screenshots/${scenario.id}.png`)) {
        missingInGuide.push(scenario.id);
      }
    }

    // Stale captures (for example from a scenario that has since been commented
    // out) are removed so the deliverable cannot ship a screenshot that is not
    // part of the current guide.
    const orphans = readdirSync(screenshotsDir).filter(
      (name) => name.endsWith('.png') && !expected.has(name)
    );
    for (const orphan of orphans) {
      unlinkSync(path.join(screenshotsDir, orphan));
    }

    expect(
      nonDesktop,
      `non-desktop screenshots are not allowed: ${nonDesktop.join(', ')}`
    ).toEqual([]);
    expect(missingInGuide, `scenarios missing from the guide: ${missingInGuide.join(', ')}`).toEqual(
      []
    );
    expect(
      readdirSync(screenshotsDir).filter((name) => name.endsWith('.png')).sort(),
      `screenshot directory should contain exactly one PNG per scenario`
    ).toEqual([...expected].sort());
  } finally {
    await context.close();
  }
});
