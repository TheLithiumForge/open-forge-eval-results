import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const deck = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];

async function loadKnownBoard(page: import('@playwright/test').Page): Promise<void> {
  await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
}

test('keyboard game exposes meaningful accessibility names and announces completion', async ({ page }) => {
  const evidence: string[] = [];
  const capture = async (label: string): Promise<void> => {
    evidence.push(`## ${label}\n${await page.locator('body').ariaSnapshot()}`);
  };
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  await capture('Initial controls and board');
  await loadKnownBoard(page);

  const first = page.locator('.board-grid > button').nth(0);
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' }).locator('.back-face')).toHaveCount(1);
  expect(await page.getByRole('button', { name: 'Row 1, column 2, closed' }).evaluate((card) => card.outerHTML)).not.toContain('cyan');
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeVisible();
  await capture('Revealed face and closed position');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Row 3, column 4, closed' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. 1 pair matched.');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, matched' })).toHaveAttribute('aria-disabled', 'true');
  await capture('First match and polite result announcement');

  const liveRegion = page.locator('[aria-live="polite"]');
  const pressCard = async (index: number): Promise<void> => {
    await page.locator('.board-grid > button').nth(index).focus();
    await page.keyboard.press('Space');
  };
  await pressCard(1);
  await pressCard(2);
  await expect(liveRegion).toHaveText('No match. Cards close after a short pause.');
  const firstMiss = await liveRegion.locator('span').elementHandle();
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' })).toBeVisible();
  await pressCard(3);
  await pressCard(4);
  await expect(liveRegion).toHaveText('No match. Cards close after a short pause.');
  if (!firstMiss) throw new Error('Expected the first miss announcement node');
  await firstMiss.waitForElementState('hidden');
  await expect(page.getByRole('button', { name: 'Row 1, column 4, closed' })).toBeVisible();
  await capture('Two consecutive misses each produce a fresh announcement');

  let matchedPairs = 1;
  for (let face = 0; face < 8; face += 1) {
    const positions = deck.flatMap((value, index) => value === face ? [index] : []);
    const firstIndex = positions[0];
    const secondIndex = positions[1];
    if (firstIndex === undefined || secondIndex === undefined || firstIndex === 0) continue;
    await page.locator('.board-grid > button').nth(firstIndex).focus();
    await page.keyboard.press('Space');
    await page.locator('.board-grid > button').nth(secondIndex).focus();
    await page.keyboard.press('Space');
    matchedPairs += 1;
    if (matchedPairs === 8) await expect(liveRegion).toHaveText(/Pair found\. All pairs found in 10 moves and \d+:\d{2}\./);
    else await expect(liveRegion).toHaveText(`Pair found. ${matchedPairs} pairs matched.`);
  }
  await expect(page.getByText('Moves: 10')).toBeVisible();
  await expect(page.getByText('Pairs: 8/8')).toBeVisible();
  await expect(liveRegion).toHaveText(/Pair found\. All pairs found in 10 moves and \d+:\d{2}\./);
  await expect(page.getByText('You found every pair!')).toBeVisible();
  await expect(page.getByText('Best: 10')).toBeVisible();
  await capture('Completed game, score, best and final announcement');

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Grid size')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0')).toBeVisible();
  await expect(page.getByText('Best: 10')).toBeVisible();
  await expect(page.getByLabel('Board code')).not.toHaveValue('np1-4-1');
  await capture('Started another game after leaving the board');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByText('Best: 10')).toBeVisible();

  await mkdir(resolve('evidence'), { recursive: true });
  await writeFile(resolve('evidence/keyboard-accessibility-tree.yml'), evidence.join('\n\n'));
});

test('unfinished snapshots pause until Resume and preserve mismatch time', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Reproduce a game', { exact: true }).click();
  const snapshot = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';
  await page.getByLabel('Snapshot JSON').fill(snapshot);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.control-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  const resume = page.getByRole('button', { name: 'Resume' });
  await expect(resume).toHaveCount(1);
  const firstPending = page.locator('.board-grid > button').nth(1);
  await firstPending.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 2')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(firstPending).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' })).toBeVisible({ timeout: 1500 });
  await expect(page.getByText('Time: 0:01')).toBeVisible();
});

test('completed snapshot stays static and does not update the saved best', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('neon-pairs.best.v1', JSON.stringify({ 4: 12 })));
  await page.reload();
  await page.getByText('Reproduce a game', { exact: true }).click();
  const snapshot = JSON.stringify({
    version: 1,
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 2000,
    started: true,
  });
  await page.getByLabel('Snapshot JSON').fill(snapshot);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.control-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.getByText('Best: 12')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/win-banner--pulse/);
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'))).toBe('{"4":12}');
});

test('saved size persists on the local origin without touching other keys', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('neon-pairs.keep-me', 'untouched'));
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.board-grid > button')).toHaveCount(36);
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.keep-me'))).toBe('untouched');
});

test('16 by 16 board scrolls within the board at phone and desktop widths', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Grid size').selectOption('16');
    const cards = page.locator('.board-grid > button');
    await expect(cards).toHaveCount(256);
    const first = cards.nth(0);
    const last = cards.nth(255);
    await first.focus();
    await last.focus();
    const cardRect = await last.boundingBox();
    const areaRect = await page.locator('.board-scroll').boundingBox();
    expect(cardRect).not.toBeNull();
    expect(areaRect).not.toBeNull();
    if (!cardRect || !areaRect) throw new Error('Board geometry is unavailable');
    expect(cardRect.width).toBeGreaterThanOrEqual(44);
    expect(cardRect.x).toBeGreaterThanOrEqual(areaRect.x + 5);
    expect(cardRect.x + cardRect.width).toBeLessThanOrEqual(areaRect.x + areaRect.width - 5);
    expect(cardRect.y).toBeGreaterThanOrEqual(areaRect.y + 5);
    expect(cardRect.y + cardRect.height).toBeLessThanOrEqual(areaRect.y + areaRect.height - 5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('the single HTML distribution opens directly from disk without network access', async ({ page }) => {
  await page.route(/^https?:\/\//, (route) => route.abort());
  const file = pathToFileURL(resolve('dist/index.html')).href;
  await page.goto(file);
  await expect(page).toHaveTitle('Neon Pairs');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  await expect(page.locator('.board-grid > button')).toHaveCount(16);
});
