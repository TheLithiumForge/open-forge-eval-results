import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { describeFace } from '../../src/game/board/face.ts';
import { BOARD_SIZES } from '../../src/game/board.ts';
import { announcedTexts, cardAt, boardFor, keyboardMoveTo, loadBoard, observeAnnouncements, pairPositions } from './helpers.ts';

test('opens each supported size, reveals a pair, and reports exact progress', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  expect(await page.getByLabel('Grid size').locator('option').allTextContents()).toEqual(
    BOARD_SIZES.map((size) => `${size}x${size}`),
  );
  for (const size of BOARD_SIZES) {
    const code = `np1-${size}-1`;
    await page.getByLabel('Grid size').selectOption(String(size));
    await loadBoard(page, code);
    const game = boardFor(code);
    const pair = pairPositions(game)[0];
    if (pair === undefined || pair[0] === undefined || pair[1] === undefined) throw new Error('Pair fixture missing');
    await cardAt(page, pair[0]).click();
    await cardAt(page, pair[0]).click();
    await expect(page.locator('.status-readout')).toContainText('Moves: 0');
    await cardAt(page, pair[1]).click();
    await expect(page.locator('.status-readout')).toContainText('Moves: 1');
    await expect(page.locator('.status-readout')).toContainText(`Pairs: 1/${size * size / 2}`);
  }
});

test('blocks a miss for 800 active milliseconds, ignores extra clicks, and resets stale turns', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  const game = boardFor('np1-4-1');
  const pairs = pairPositions(game);
  const matched = pairs[0];
  if (matched === undefined || matched[0] === undefined || matched[1] === undefined) throw new Error('Matched fixture missing');
  const matchedPositions = new Set(matched);
  const missA = game.deck.findIndex((_face, index) => !matchedPositions.has(index));
  const firstFace = game.deck[missA];
  const missB = game.deck.findIndex((face, index) => !matchedPositions.has(index) && index !== missA && face !== firstFace);
  await cardAt(page, matched[0]).click();
  await cardAt(page, matched[1]).click();
  await cardAt(page, missA).click();
  await cardAt(page, missB).click();
  const missFace = game.deck[missA];
  if (missFace === undefined) throw new Error('Mismatch fixture missing');
  await expect(cardAt(page, missA)).toHaveAttribute('aria-label', new RegExp(`${describeFace(missFace).name.replaceAll(' ', '\\s+')}, revealed$`));
  await cardAt(page, 2).click({ force: true });
  await page.clock.runFor(799);
  await expect(page.locator('.status-readout')).toContainText('Pairs: 1/8');
  await expect(cardAt(page, missA)).toHaveAttribute('aria-disabled', 'true');
  await page.clock.runFor(1);
  await expect(cardAt(page, missA)).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('.status-readout')).toContainText('Moves: 2');

  await cardAt(page, missA).click();
  await cardAt(page, missB).click();
  await expect(cardAt(page, missA)).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('.status-readout')).toContainText('Moves: 0');
  await expect(cardAt(page, 0).locator('svg')).toHaveCount(1);
  await page.clock.runFor(900);
  await expect(cardAt(page, missA)).toHaveAttribute('aria-label', /closed$/);
});

test('completes the 4x4 keyboard journey and records its accessibility tree', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.locator('.reproduction-panel summary').click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cardAt(page, 0)).toBeFocused();
  const snapshots = ['# Initial keyboard journey\n' + await page.locator('body').ariaSnapshot()];
  await observeAnnouncements(page);

  await page.keyboard.press('ArrowLeft');
  await expect(cardAt(page, 0)).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(cardAt(page, 0)).toBeFocused();
  await page.keyboard.press('Enter');
  const face = boardFor('np1-4-1').deck[0];
  if (face === undefined) throw new Error('First face fixture missing');
  await expect(cardAt(page, 0)).toHaveAttribute('aria-label', `Row 1, column 1, ${describeFace(face).name}, revealed`);
  snapshots.push('# Revealed\n' + await page.locator('body').ariaSnapshot());
  await keyboardMoveTo(page, 0, 11, 4);
  await page.keyboard.press('Enter');
  await expect(cardAt(page, 11)).toHaveAttribute('aria-disabled', 'true');
  await expect(cardAt(page, 11)).toBeFocused();
  snapshots.push('# Matched\n' + await page.locator('body').ariaSnapshot());

  let focused = 11;
  const pairs = pairPositions(boardFor('np1-4-1')).filter((pair) => pair[0] !== 0);
  for (const pair of pairs) {
    const first = pair[0];
    const second = pair[1];
    if (first === undefined || second === undefined) throw new Error('Pair fixture incomplete');
    await keyboardMoveTo(page, focused, first, 4);
    await page.keyboard.press('Enter');
    await keyboardMoveTo(page, first, second, 4);
    await page.keyboard.press('Enter');
    focused = second;
  }
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.locator('.status-readout')).toContainText('Moves: 8');
  await expect(page.getByRole('region', { name: 'Game complete' })).toContainText('Time:');
  await expect.poll(async () => announcedTexts(page)).toHaveLength(8);
  const finalTree = await page.locator('body').ariaSnapshot();
  snapshots.push('# Win\n' + finalTree);
  expect(finalTree).toContain('All pairs found!');
  expect(finalTree).toContain('Best:');
  expect(finalTree).toContain('strong: "8"');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  snapshots.push('# Tab leaves the board\n' + await page.locator('body').ariaSnapshot());
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.status-readout')).toContainText('Moves: 0');

  const output = resolve('evidence/accessibility/keyboard-journey.txt');
  await mkdir(resolve('evidence/accessibility'), { recursive: true });
  await writeFile(output, `Chromium ${await page.evaluate(() => navigator.userAgent)}\n\n${snapshots.join('\n\n')}`, 'utf8');
});

test('completed touch taps reveal cards once and right-click leaves the state closed', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await loadBoard(page, 'np1-4-1');
    const card = cardAt(page, 0);
    await card.click({ button: 'right' });
    await expect(card).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
    await card.tap();
    await expect(card).toHaveAttribute('aria-label', /revealed$/);
    await expect(page.locator('.status-readout')).toContainText('Moves: 0');
  } finally {
    await context.close();
  }
});
