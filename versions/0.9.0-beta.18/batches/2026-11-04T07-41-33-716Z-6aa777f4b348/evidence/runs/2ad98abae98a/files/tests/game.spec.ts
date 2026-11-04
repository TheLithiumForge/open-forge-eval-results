import { expect, test } from '@playwright/test';
import { cards, evidence, exported, finish, literalDeck, loadCode, loadSnapshot, nearWin, openTools } from './fixtures.ts';

test('keyboard and accessibility-tree journey through a complete 4x4 game', async ({ page, browser }, info) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  expect(await page.locator('details').getAttribute('open')).toBeNull();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await expect(page.getByRole('heading', { name: 'Neon Pairs', level: 1 })).toBeVisible();
  await loadCode(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  await evidence(info, 'accessibility-initial.txt', await page.locator('body').ariaSnapshot(), 'text/plain');
  let current = 0;
  for (let face = 0; face < 8; face++) {
    for (const [target, value] of literalDeck.entries()) {
      if (face !== value) continue;
      while (Math.floor(current / 4) !== Math.floor(target / 4)) {
        const down = current < target;
        await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp');
        current += down ? 4 : -4;
      }
      while (current !== target) {
        const right = current < target;
        await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
        current += right ? 1 : -1;
      }
      await page.keyboard.press(target % 2 ? 'Space' : 'Enter');
      await expect(cards(page).nth(target)).toHaveAccessibleName(/(revealed|matched)$/);
      if (face === 0 && target === 2) await evidence(info, 'accessibility-revealed.txt',
        await page.locator('body').ariaSnapshot(), 'text/plain');
    }
    await expect(page.locator('[aria-live]')).toHaveText(face === 7
      ? /Pair found\. All pairs found in 8 moves and \d+:\d{2}\./
      : `Pair found. ${face + 1} ${face ? 'pairs' : 'pair'} matched.`);
  }
  await expect(page.getByText('Moves: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Pairs: 8/8', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(cards(page).nth(current)).toHaveAttribute('aria-disabled', 'true');
  await evidence(info, 'accessibility-completed.txt', await page.locator('body').ariaSnapshot(), 'text/plain');
  await evidence(info, 'browser-version.txt', browser.version(), 'text/plain');
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

for (const size of [4, 6, 8, 10, 12, 14, 16]) {
  test(`completes every pair on ${size}x${size}`, async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    const code = `np1-${size}-1`;
    await loadCode(page, code);
    await expect(cards(page)).toHaveCount(size ** 2);
    await finish(page, code);
    await expect(page.getByText(`Moves: ${size ** 2 / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size ** 2 / 2}/${size ** 2 / 2}`, { exact: true })).toBeVisible();
  });
}

test('pointer, touch, cancellation, ignored activations and hidden DOM', async ({ page, browser }) => {
  await page.goto('/');
  await loadCode(page);
  const hidden = await cards(page).all();
  const firstHtml = await hidden[0]?.innerHTML();
  for (const card of hidden) {
    expect(await card.innerHTML()).toBe(firstHtml);
    expect(await card.getAttribute('aria-label')).toMatch(/^Row \d+, column \d+, closed$/);
    expect(await card.evaluate(node => node.getAttributeNames())).toEqual([
      'type', 'class', 'tabindex', 'aria-label', 'aria-disabled',
    ]);
  }
  await cards(page).nth(0).hover();
  await cards(page).nth(0).click({ button: 'right' });
  await cards(page).nth(0).dispatchEvent('pointercancel');
  expect((await exported(page)).started).toBe(false);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  expect((await exported(page)).moves).toBe(0);
  await cards(page).nth(11).click();
  expect((await exported(page)).matched).toEqual([0, 11]);
  const context = await browser.newContext({ hasTouch: true });
  const touch = await context.newPage();
  await touch.goto('http://127.0.0.1:4173/');
  await loadCode(touch);
  await cards(touch).nth(0).tap();
  await cards(touch).nth(11).tap();
  await expect(touch.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await context.close();
});

test('best scores, preferences and imported completion semantics', async ({ page }) => {
  await page.goto('/');
  for (const moves of [11, 11, 14]) {
    await loadSnapshot(page, nearWin(moves));
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.getByText('Best: 12', { exact: true })).toBeVisible();
  }
  await loadSnapshot(page, nearWin(8, true));
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Loaded completed snapshot.', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: 12', { exact: true })).toBeVisible();
  await loadSnapshot(page, nearWin(7));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Grid size' }).selectOption('6');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Grid size' }).selectOption('4');
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});

test('reproduction drafts, validation, fresh deals and control focus', async ({ page }) => {
  await page.goto('/');
  await loadCode(page, '  np1-6-1  ');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-1');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByText('Invalid board code.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await expect(cards(page)).toHaveCount(36);
  await page.getByLabel('Snapshot JSON').fill('{"version":2}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByText('Invalid snapshot.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"version":2}');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-1');
  await expect(cards(page).nth(0)).toHaveAttribute('tabindex', '0');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-6-1');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await exported(page);
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('6');
});

test('unavailable and corrupt storage leave play usable and unrelated keys intact', async ({ browser }) => {
  for (const blocked of [false, true]) {
    const context = await browser.newContext();
    await context.addInitScript(blocked => {
      if (blocked) Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Unavailable'); } });
      else { localStorage.setItem('unrelated', 'keep'); localStorage.setItem('neon-pairs.preferences.v1', '{'); }
    }, blocked);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadCode(page);
    await finish(page);
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
    if (!blocked) expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
    await context.close();
  }
});

test('modified keys keep browser defaults and never reveal cards', async ({ page }) => {
  await page.goto('/');
  await openTools(page);
  await cards(page).nth(0).focus();
  for (const modifier of ['Shift', 'Control', 'Alt', 'Meta']) {
    for (const key of ['Enter', 'Space', 'ArrowRight']) await page.keyboard.press(`${modifier}+${key}`);
  }
  await expect(cards(page).nth(0)).toBeFocused();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
});
