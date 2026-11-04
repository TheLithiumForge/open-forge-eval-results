import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { faceSheet } from './artwork.ts';

test('records all 128 identities in a 44px grayscale face sheet', async ({ page }) => {
  await page.setContent(faceSheet());
  await expect(page.locator('.face')).toHaveCount(128);
  expect(await page.locator('.face').first().evaluate((element) => element.getBoundingClientRect().width)).toBe(44);
  const drawings = await page.locator('.face svg').evaluateAll((elements) => elements.map((element) => element.outerHTML));
  expect(new Set(drawings).size).toBe(128);
  await mkdir('evidence', { recursive: true });
  await page.locator('#sheet').screenshot({ path: 'evidence/face-sheet-grayscale.png' });
});
