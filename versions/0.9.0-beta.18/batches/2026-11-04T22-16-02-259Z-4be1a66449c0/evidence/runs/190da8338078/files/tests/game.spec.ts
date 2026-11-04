import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { parseBoardCode } from '../src/game/board/deal.ts';

const BASE = 'http://127.0.0.1:4173';

function card(page: import('@playwright/test').Page, index: number, size: number) {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  return page.getByRole('button', { name: new RegExp(`^Row ${row}, column ${column}, `) });
}

function pairs(deck: readonly number[]) {
  const positions = new Map<number, number[]>();
  deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]));
  return [...positions.values()].map((indexes) => {
    const [first, second, ...extra] = indexes;
    if (first === undefined || second === undefined || extra.length > 0) throw new Error('The board must contain pairs.');
    return { first, second };
  });
}

async function loadBoard(page: import('@playwright/test').Page, code: string) {
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill(code);
  await page.getByRole('button', { name: 'Load board' }).click();
}

test('every supported board can be completed and matched cards stay named', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(BASE);
  for (const size of [4, 6, 8, 10, 12, 14, 16]) {
    if (size !== 4) await page.getByLabel('Grid size').selectOption(String(size));
    const code = await page.getByLabel('Board code').inputValue();
    const deck = parseBoardCode(code)?.deck;
    if (!deck) throw new Error('The game produced an invalid board code.');
    expect(deck).toHaveLength(size * size);
    for (const pair of pairs(deck)) {
      await card(page, pair.first, size).click();
      await card(page, pair.second, size).click();
    }
    const total = size * size / 2;
    await expect(page.getByRole('heading', { name: 'Beautifully done.' })).toBeVisible();
    await expect(page.getByText(`Pairs: ${total}/${total}`)).toBeVisible();
    await expect(page.getByText(`Moves: ${total}`)).toBeVisible();
    await expect(card(page, 0, size)).toHaveAttribute('aria-disabled', 'true');
    const matchedTree = await page.getByRole('group', { name: `${size} by ${size} card board` }).ariaSnapshot();
    expect(matchedTree).toContain('matched');
  }
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('16');
  await expect(page.getByText('Best: 128')).toBeVisible();
});

test('best score keeps better results and survives equal, worse and reload cases', async ({ page }) => {
  await page.goto(BASE);
  await loadBoard(page, 'np1-4-1');
  const deck = parseBoardCode('np1-4-1')?.deck;
  if (!deck) throw new Error('The documented board code was rejected.');
  const solve = async () => {
    for (const pair of pairs(deck)) {
      await card(page, pair.first, 4).click();
      await card(page, pair.second, 4).click();
    }
    await expect(page.getByRole('heading', { name: 'Beautifully done.' })).toBeVisible();
  };

  await solve();
  await expect(page.getByText('Best: 8')).toBeVisible();
  await page.getByRole('button', { name: 'Restart' }).click();
  await card(page, 0, 4).click();
  await card(page, 1, 4).click();
  await expect(card(page, 0, 4)).toHaveAttribute('aria-label', /closed/, { timeout: 1500 });
  await solve();
  await expect(page.getByText('Moves: 9')).toBeVisible();
  await expect(page.getByText('Best: 8')).toBeVisible();
  await page.getByRole('button', { name: 'Restart' }).click();
  await solve();
  await expect(page.getByText('Best: 8')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Best: 8')).toBeVisible();
});

test('mismatch timing, imports, focus, statuses and completed snapshot behavior', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs.best-moves.v1', JSON.stringify({ '4': 9 })));
  await page.goto(BASE);
  await loadBoard(page, 'np1-4-1');
  await page.getByLabel('Board code').fill('np1-4-1 draft');
  await card(page, 2, 4).click();
  await card(page, 6, 4).click();
  await expect(page.getByText('Moves: 1')).toBeVisible();
  await expect(page.getByText('Pairs: 1/8')).toBeVisible();
  await expect(page.getByLabel('Board code')).toHaveValue('np1-4-1 draft');
  await card(page, 0, 4).click();
  await card(page, 1, 4).click();
  await expect(page.getByText('Moves: 2')).toBeVisible();
  await expect(card(page, 0, 4)).toHaveAttribute('aria-label', /revealed/);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const exported = await page.getByLabel('Snapshot JSON').inputValue();
  expect(exported).toMatch(/"remainingMs":\s*[1-9]\d*/);
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
  await expect(page.getByText('Moves: 2')).toBeVisible();
  await expect(card(page, 0, 4)).toHaveAttribute('aria-label', /closed/, { timeout: 1500 });

  const pending = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true });
  await page.getByLabel('Snapshot JSON').fill(pending);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByText('Loaded snapshot. Select Resume to continue.')).toBeVisible();
  await expect(card(page, 3, 4)).toHaveAttribute('aria-disabled', 'true');
  await card(page, 3, 4).dispatchEvent('click');
  await expect(page.getByText('Moves: 2')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(card(page, 0, 4)).toBeFocused();
  await expect(card(page, 1, 4)).toHaveAttribute('aria-label', /closed/, { timeout: 1000 });

  const completed = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, index) => index), selection: { kind: 'closed' }, moves: 8, elapsedMs: 9000, started: true });
  await page.getByLabel('Snapshot JSON').fill(completed);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByText('Loaded completed snapshot.')).toBeVisible();
  await expect(page.getByText('Best: 9')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/win-celebrate/);

  await page.getByLabel('Board code').fill('np1-4-01');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByText('Invalid board code.')).toBeVisible();
  await expect(page.getByText('Pairs: 8/8')).toBeVisible();
  await page.getByLabel('Snapshot JSON').fill('{broken');
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByText('Invalid snapshot.')).toBeVisible();
});

test('saved size survives reload and bad preference data is ignored', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.setItem('neon-pairs.last-size.v1', '"not-a-size"'));
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await page.getByLabel('Grid size').selectOption('6');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByText('Pairs: 0/18')).toBeVisible();
});

test('the built HTML opens from disk without HTTP requests', async ({ page }) => {
  const httpRequests: string[] = [];
  page.on('request', (request) => { if (request.url().startsWith('http')) httpRequests.push(request.url()); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await expect(page.getByRole('group', { name: '4 by 4 card board' })).toBeVisible();
  expect(httpRequests).toEqual([]);
});
