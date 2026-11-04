import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { clickCard, openReproduction, pairsForCode } from './helpers.ts';
import { faceIdentity } from '../src/game/board/faceIdentity.ts';

test('complete keyboard journey exposes names, turn results, win summary and accessibility tree', async ({ page, browser }) => {
  await page.goto('/');
  const gridSize = page.getByRole('combobox', { name: 'Grid size' });
  await gridSize.focus();
  await page.keyboard.press('Tab');
  const newGame = page.getByRole('button', { name: 'New Game', exact: true });
  await expect(newGame).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(newGame).toBeFocused();
  await page.locator('.reproduction-panel summary').click();
  const boardCode = await page.getByLabel('Board code', { exact: true }).inputValue();
  await page.keyboard.press('Shift+Tab');
  const cards = page.locator('.board-card');
  await expect(cards.nth(0)).toBeFocused();
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
  await expect(page.locator('.face-art')).toHaveCount(0);
  const initialTree = await accessibilityTree(page);
  expect(initialTree).toContain('button | Row 1, column 1, closed');
  const hiddenCardAttributes = await cards.nth(0).evaluate((element) =>
    Array.from(element.attributes, (attribute) => `${attribute.name}=${attribute.value}`)
  );
  expect(hiddenCardAttributes.join(' ')).not.toMatch(/face[-_ ]?(id|identity)|deck/i);

  const pairs = pairsForCode(boardCode);
  let focus = 0;
  let revealedTree = '';
  const size = 4;
  for (const pair of pairs) {
    for (const target of pair.positions) {
      await moveWithArrows(page, focus, target, size);
      await page.keyboard.press('Enter');
      focus = target;
      if (target === pair.positions[0]) {
        await expect(cards.nth(target)).toHaveAttribute(
          'aria-label',
          `Row ${Math.floor(target / size) + 1}, column ${target % size + 1}, ${faceIdentity(pair.face).name}, revealed`
        );
        revealedTree = await accessibilityTree(page);
      }
    }
    await expect(cards.nth(pair.positions[1])).toHaveAttribute('aria-disabled', 'true');
  }
  const winText = `Pair found. All pairs found in ${pairs.length} moves and`;
  await expect(page.locator('[aria-live="polite"]')).toContainText(winText);
  await expect(page.locator('.win-banner')).toContainText(`${pairs.length} moves`);
  const wonTree = await accessibilityTree(page);
  expect(wonTree).toContain('Row 1, column 1');
  expect(wonTree).toContain('All pairs found');
  expect(wonTree).toContain('Moves:');
  const visibleScores = await page.locator('.score-strip').innerText();
  expect(visibleScores).toContain(`Moves: ${pairs.length}`);

  mkdirSync(resolve('evidence'), { recursive: true });
  writeFileSync(resolve('evidence/accessibility-tree.txt'), [
    `Node ${process.version}; Playwright 1.64.1; Chromium ${browser.version()}`,
    'Initial board accessibility tree:', initialTree,
    'A revealed card accessibility tree:', revealedTree,
    'Completed board accessibility tree:', wonTree,
    'Visible final score:', visibleScores
  ].join('\n\n'));
  await page.screenshot({ path: resolve('evidence/keyboard-4x4-win.png'), fullPage: true });

  await page.keyboard.press('Tab');
  await expect(page.locator('.reproduction-panel summary')).toBeFocused();
  await gridSize.focus();
  await page.keyboard.press('Tab');
  await expect(newGame).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.score-strip')).toContainText('Moves: 0');
  await expect(newGame).toBeFocused();
});

test('modifier keys do not activate a card; pointer, cancellation and touch share card rules', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await openReproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  const first = page.locator('.board-card').nth(0);
  await first.focus();
  await page.keyboard.press('Shift+Enter');
  await expect(first).toHaveAttribute('data-state', 'closed');
  await first.hover();
  await first.dispatchEvent('pointercancel', { pointerId: 9, pointerType: 'touch' });
  await expect(first).toHaveAttribute('data-state', 'closed');
  await first.click({ button: 'right' });
  await expect(first).toHaveAttribute('data-state', 'closed');
  await first.click();
  await expect(first).toHaveAttribute('data-state', 'revealed');

  const touchContext = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto('http://127.0.0.1:4173/');
    const card = touchPage.locator('.board-card').nth(6);
    await card.tap();
    await expect(card).toHaveAttribute('data-state', 'revealed');
  } finally {
    await touchContext.close();
  }
});

test('the board has one remembered tab stop, edge-stopped arrows, native Tab, Space, and focusable matches', async ({ page }) => {
  await page.goto('/');
  const boardCode = 'np1-4-1';
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await openReproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill(boardCode);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  const cards = page.locator('.board-card');
  const oneTabStop = page.locator('.board-card[tabindex="0"]');
  await expect(oneTabStop).toHaveCount(1);
  await cards.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Control+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(cards.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(1)).toHaveAttribute('data-state', 'revealed');
  await expect(page.locator('.score-strip')).toContainText('Moves: 0');

  await page.keyboard.press('Tab');
  await expect(page.locator('.reproduction-panel summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(1)).toBeFocused();
  await expect(oneTabStop).toHaveAttribute('aria-label', /column 2/);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(9)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(9)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.score-strip')).toContainText('Moves: 1');
  await expect(oneTabStop).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('.reproduction-panel summary')).toBeFocused();
  expect(await page.locator('[aria-live="polite"]').count()).toBe(1);
});

async function moveWithArrows(page: Page, from: number, to: number, size: number): Promise<void> {
  let row = Math.floor(from / size);
  let column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  while (row < targetRow) { await page.keyboard.press('ArrowDown'); row += 1; }
  while (row > targetRow) { await page.keyboard.press('ArrowUp'); row -= 1; }
  while (column < targetColumn) { await page.keyboard.press('ArrowRight'); column += 1; }
  while (column > targetColumn) { await page.keyboard.press('ArrowLeft'); column -= 1; }
}

async function accessibilityTree(page: Page): Promise<string> {
  const session = await page.context().newCDPSession(page);
  try {
    const tree = await session.send('Accessibility.getFullAXTree');
    return tree.nodes.filter((node) => !node.ignored).map((node) => {
      const role = String(node.role?.value ?? '');
      const name = String(node.name?.value ?? '');
      return `${role} | ${name}`;
    }).filter((line) => line !== ' | ').join('\n');
  } finally {
    await session.detach();
  }
}
