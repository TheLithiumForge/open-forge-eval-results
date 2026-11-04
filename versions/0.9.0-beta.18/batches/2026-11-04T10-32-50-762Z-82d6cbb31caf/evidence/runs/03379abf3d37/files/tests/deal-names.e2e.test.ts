import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('editing and clearing a deal name preserves progress and the active mismatch deadline', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('🃏'.repeat(20) + 'x');
  await expect(name).toHaveValue('🃏'.repeat(20));
  await name.fill('  Café 🃏  ');
  const exportButton = page.getByRole('button', { name: 'Export snapshot', exact: true });
  await exportButton.click();
  await expect(exportButton).toBeFocused();
  const text = await page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
  expect(text).toContain('\n');
  expect(JSON.parse(text)).toEqual({ ...before, version: 2, name: '  Café 🃏  ' });
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(800);
});

test('names clear on every deal reset and never enter saved preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  for (const action of ['New Game', 'Restart', 'Grid size', 'Load board']) {
    await name.fill('My saved deal');
    if (action === 'Grid size') {
      await page.getByLabel(action, { exact: true }).selectOption('6');
    } else {
      if (action === 'Load board')
        await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
      const button = page.getByRole('button', { name: action, exact: true });
      await button.click();
      await expect(button).toBeFocused();
    }
    await expect(name).toHaveValue('');
  }
  await name.fill('Private in-memory name');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(preferences).not.toBeNull();
  expect(preferences).not.toContain('name');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  const snapshot = await exportedSnapshot(page);
  expect(snapshot.version).toBe(1);
  expect(Object.hasOwn(snapshot, 'name')).toBe(false);
});
