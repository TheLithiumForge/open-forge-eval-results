import { expect } from './browser-test.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

async function openReproduction(page: Page): Promise<void> {
  if ((await page.locator('details').getAttribute('open')) === null)
    await page.locator('summary').click();
}

export async function readNamedSnapshot(page: Page): Promise<Record<string, unknown>> {
  await openReproduction(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Snapshot JSON', { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected snapshot object.');
  return value;
}

export async function pasteSnapshot(page: Page, draft: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(draft);
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
}
