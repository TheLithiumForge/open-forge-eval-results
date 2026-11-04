import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseBoardCode } from '../src/game/board/deal.ts';

const BASE = 'http://127.0.0.1:4173';
type Pair = Readonly<{ first: number; second: number }>;

function pairs(deck: readonly number[]): Pair[] {
  const positions = new Map<number, number[]>();
  deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]));
  return [...positions.values()].map((indexes) => {
    const [first, second, ...extra] = indexes;
    if (first === undefined || second === undefined || extra.length > 0) throw new Error('The board must contain pairs.');
    return { first, second };
  });
}

function card(page: import('@playwright/test').Page, index: number) {
  const row = Math.floor(index / 4) + 1;
  const column = index % 4 + 1;
  return page.getByRole('button', { name: new RegExp(`^Row ${row}, column ${column}, `) });
}

test('keyboard and accessibility-tree journey completes a 4 by 4 game', async ({ page }) => {
  await page.goto(BASE);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Grid size')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(card(page, 0)).toBeFocused();

  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByRole('button', { name: 'Load board' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(card(page, 0)).toBeFocused();
  await expect(page.getByText('Moves: 0')).toBeVisible();
  const code = await page.getByLabel('Board code').inputValue();
  const deck = parseBoardCode(code)?.deck;
  if (!deck) throw new Error('The game produced an invalid board code.');
  const board = page.getByRole('group', { name: '4 by 4 card board' });
  const closedTree = await board.ariaSnapshot();
  expect(closedTree).toContain('Row 1, column 1, closed');
  expect(closedTree).toContain('Row 4, column 4, closed');
  expect(await page.locator('.face-art').count()).toBe(0);
  const hiddenMarkup = await page.evaluate<string>(`document.querySelector('.board-grid > button')?.outerHTML ?? ''`);
  expect(hiddenMarkup).not.toContain('face-art');
  expect(hiddenMarkup).not.toContain('cyan');

  let focused = 0;
  let revealedTree = '';
  const moveTo = async (destination: number) => {
    while (Math.floor(focused / 4) > Math.floor(destination / 4)) { await page.keyboard.press('ArrowUp'); focused -= 4; }
    while (Math.floor(focused / 4) < Math.floor(destination / 4)) { await page.keyboard.press('ArrowDown'); focused += 4; }
    while (focused % 4 > destination % 4) { await page.keyboard.press('ArrowLeft'); focused -= 1; }
    while (focused % 4 < destination % 4) { await page.keyboard.press('ArrowRight'); focused += 1; }
  };
  for (const pair of pairs(deck)) {
    await moveTo(pair.first);
    await page.keyboard.press('Enter');
    const currentTree = await board.ariaSnapshot();
    expect(currentTree).toContain('revealed');
    if (!revealedTree) {
      revealedTree = currentTree;
      await expect(page.locator('.face-art')).toHaveCount(1);
    }
    await moveTo(pair.second);
    await page.keyboard.press('Space');
  }

  await expect(page.getByRole('heading', { name: 'Beautifully done.' })).toBeVisible();
  await expect(page.getByText('Pairs: 8/8')).toBeVisible();
  await expect(page.locator('.live-announcer')).toContainText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./, { timeout: 12_000 });
  const matchedTree = await board.ariaSnapshot();
  expect(matchedTree).toContain('matched');
  await expect(page.locator('.face-art')).toHaveCount(16);
  await test.info().attach('4x4-accessibility-tree-closed', { body: Buffer.from(closedTree), contentType: 'text/plain' });
  await test.info().attach('4x4-accessibility-tree-revealed', { body: Buffer.from(revealedTree), contentType: 'text/plain' });
  await test.info().attach('4x4-accessibility-tree-matched', { body: Buffer.from(matchedTree), contentType: 'text/plain' });
  const evidence = `# Automated accessibility tree evidence

Captured from the Chromium keyboard journey in tests/accessibility.spec.ts using Playwright's ariaSnapshot().

## Closed cards

~~~yaml
${closedTree}
~~~

## Revealed card

~~~yaml
${revealedTree}
~~~

## Matched cards

~~~yaml
${matchedTree}
~~~
`;
  await writeFile(resolve('docs/accessibility-tree-evidence.md'), evidence);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game')).toBeFocused();
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.getByText('Pairs: 0/8')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
});
