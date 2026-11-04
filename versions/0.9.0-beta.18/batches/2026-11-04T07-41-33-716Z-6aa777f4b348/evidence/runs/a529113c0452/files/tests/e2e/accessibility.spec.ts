import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, deal, live, loadBoard, openGame, stat } from './support.ts';

test('complete keyboard journey exposes positions, faces, results and win in the accessibility tree', async ({ page, browser }) => {
  await openGame(page, true);
  const evidence: string[] = [`# Keyboard accessibility journey\n\nChromium ${browser.version()}, Playwright 1.64.1; no screen reader used.`];
  const tree = (text: string) => `\`\`\`yaml\n${text}\n\`\`\``;
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  evidence.push('## Hidden board', tree(await page.locator('main').ariaSnapshot()));
  const game = deal(await page.getByLabel('Board code').inputValue());
  let position = 0;
  const move = async (destination: number) => {
    while (Math.floor(position / 4) !== Math.floor(destination / 4)) {
      const down = position < destination;
      await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp');
      position += down ? 4 : -4;
    }
    while (position !== destination) {
      const right = position < destination;
      await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
      position += right ? 1 : -1;
    }
    await expect(cards(page).nth(position)).toBeFocused();
  };
  for (let face = 0; face < 8; face += 1) {
    await move(game.board.deck.indexOf(face));
    await page.keyboard.press('Enter');
    if (face === 0) evidence.push('## First revealed face', tree(await cards(page).nth(position).ariaSnapshot()));
    await move(game.board.deck.lastIndexOf(face));
    await page.keyboard.press('Space');
    const result = face === 7 ? 'Pair found. All pairs found in 8 moves and 0:00.'
      : `Pair found. ${face + 1} ${face === 0 ? 'pair' : 'pairs'} matched.`;
    await expect(live(page)).toHaveText(result);
    evidence.push(`## Turn ${face + 1}`, result);
  }
  evidence.push('## Complete board and final summary', tree(await page.locator('main').ariaSnapshot()));
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  for (let count = 0; count < 3; count += 1) await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
  evidence.push('## New game from keyboard', tree(await page.locator('main').ariaSnapshot()));
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-accessibility.md', evidence.join('\n\n') + '\n');
});

test('one atomic live region updates once per result, including identical consecutive misses', async ({ page }) => {
  await openGame(page, true);
  await loadBoard(page);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(live(page)).toHaveAttribute('aria-atomic', 'true');
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    if (region === null) throw new Error('Missing live region.');
    document.documentElement.dataset.resultUpdates = '0';
    new MutationObserver((records) => {
      if (records.length > 0) document.documentElement.dataset.resultUpdates =
        String(Number(document.documentElement.dataset.resultUpdates) + 1);
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });
  for (let turn = 1; turn <= 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await expect(live(page)).toHaveText('No match. Cards close after a short pause.');
    await expect(page.locator('html')).toHaveAttribute('data-result-updates', String(turn));
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(1000);
    await expect(page.locator('html')).toHaveAttribute('data-result-updates', String(turn));
  }
  await page.getByLabel('Board code').fill('bad');
  for (let load = 3; load <= 4; load += 1) {
    await page.getByRole('button', { name: 'Load board', exact: true }).click();
    await expect(live(page)).toHaveText('Invalid board code.');
    await expect(page.locator('html')).toHaveAttribute('data-result-updates', String(load));
  }
});
