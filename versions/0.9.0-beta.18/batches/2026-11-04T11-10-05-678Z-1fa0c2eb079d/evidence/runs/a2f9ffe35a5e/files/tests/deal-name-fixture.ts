import { expect } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

// Independent pasted data: version and selection kind deliberately come last.
export const NAMED_PROGRESS = {
  boardCode: 'np1-4-1',
  name: '  Café 🎴  ',
  matched: [0, 11],
  moves: 2,
  elapsedMs: 1500,
  started: true,
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  version: 2,
};

export async function openReproduction(page: Page): Promise<void> {
  if ((await page.locator('details[open]').count()) === 0) await page.locator('summary').click();
}

export async function pasteSnapshot(page: Page, value: unknown): Promise<void> {
  await openReproduction(page);
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(JSON.stringify(value));
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await load.click();
  await expect(load).toBeFocused();
}

export async function readSnapshot(page: Page): Promise<Record<string, unknown>> {
  await openReproduction(page);
  const button = page.getByRole('button', {
    name: ReproductionControl.exportSnapshot,
    exact: true,
  });
  await button.click();
  await expect(button).toBeFocused();
  const value: unknown = JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected snapshot JSON.');
  return value;
}
