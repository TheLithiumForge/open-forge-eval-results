import { expect, test } from './browser-test.ts';
import { GAME_URL, PHONE } from './game-fixture.ts';
import { offScale } from './spacing-scale.ts';
import { EIGHT, enterPlayers, openTournament } from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const TARGET_PHONE = { width: 390, height: 844 };
const LONG_NAMES = EIGHT.map((name) => `${name}${'x'.repeat(20 - name.length)}`);

// Every new control is at least 44 by 44 CSS pixels, and the page never scrolls sideways.
async function checkScreen(page: Page, stage: string): Promise<void> {
  const controls = page.locator(
    'main button:visible, main select:visible, main input:visible, main textarea:visible',
  );
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    const name = await control.evaluate((element) => element.outerHTML.slice(0, 60));
    expect(box?.width, `${stage} ${name} width`).toBeGreaterThanOrEqual(44);
    expect(box?.height, `${stage} ${name} height`).toBeGreaterThanOrEqual(44);
  }
  const width = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(width, `${stage} keeps the page within the viewport`).toBeLessThanOrEqual(0);
  expect(await offScale(page), `${stage} spacing`).toEqual([]);
}

for (const viewport of [PHONE, TARGET_PHONE, { width: 1280, height: 800 }])
  test(`tournament screens keep spacing, targets and width at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(GAME_URL);
    await openTournament(page);
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    await checkScreen(page, 'setup');
    await enterPlayers(page, LONG_NAMES);
    await checkScreen(page, 'ready');
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await checkScreen(page, 'playing');
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    for (const control of await page.getByRole('dialog').getByRole('button').all()) {
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await offScale(page), 'leave dialog spacing').toEqual([]);
    await page.keyboard.press('Escape');
  });
