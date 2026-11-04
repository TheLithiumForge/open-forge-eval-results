import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect, cards, live, status, loadBoard, freezeClock, LITERAL_DECK } from './game.ts';

async function moveTo(page: Page, current: number, target: number): Promise<number> {
  while (Math.floor(current / 4) !== Math.floor(target / 4)) {
    const down = current < target;
    await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp');
    current += down ? 4 : -4;
  }
  while (current % 4 !== target % 4) {
    const right = current % 4 < target % 4;
    await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
    current += right ? 1 : -1;
  }
  await expect(cards(page).nth(target)).toBeFocused();
  return current;
}
async function observeAnnouncements(page: Page) {
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live="polite"]');
    if (!region) throw new Error('Missing announcement region');
    const log = document.createElement('div');
    log.id = 'test-announcement-log';
    log.hidden = true;
    document.body.append(log);
    new MutationObserver(() => {
      const entry = document.createElement('div');
      entry.textContent = region.textContent;
      log.append(entry);
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });
}

test('complete keyboard accessibility-tree journey, one result per turn, Tab exit and new game', async ({ page, browser }, info) => {
  await freezeClock(page);
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  const closedTree = await page.locator('main').ariaSnapshot();
  expect(closedTree).toContain('Row 1, column 1, closed');
  await expect(cards(page).locator('svg')).toHaveCount(0);
  const attributes = await cards(page).evaluateAll((buttons) => buttons.map((button) => button.outerHTML));
  expect(attributes.every((html) => !/data-face|marker|solid|outline|cyan|magenta|rose|circle|chevron/i.test(html))).toBe(true);
  await observeAnnouncements(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(0)).toBeFocused();
  let current = 0;
  let revealedTree = '';
  for (let face = 0; face < 8; face += 1) {
    const indices = LITERAL_DECK.flatMap((value, index) => value === face ? [index] : []);
    for (const [turnIndex, index] of indices.entries()) {
      current = await moveTo(page, current, index);
      await page.keyboard.press(turnIndex === 0 ? 'Enter' : 'Space');
      if (face === 0 && turnIndex === 0) {
        revealedTree = await page.locator('main').ariaSnapshot();
        expect(revealedTree).toContain('Row 1, column 3, cyan solid circle, marker top, revealed');
      }
    }
    await expect(page.locator('#test-announcement-log > div')).toHaveCount(face + 1);
    if (face < 7) await expect(live(page)).toHaveText(`Pair found. ${face + 1} ${face === 0 ? 'pair' : 'pairs'} matched.`);
  }
  await expect(live(page)).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  const wonTree = await page.locator('main').ariaSnapshot();
  expect(wonTree).toContain('All pairs found!');
  expect(wonTree).toContain('Finished in 8 moves and 0:00.');
  expect(wonTree).toContain('matched');
  await page.clock.runFor(5000);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(page.locator('#test-announcement-log > div')).toHaveCount(8);
  await expect(status(page, 'Moves')).toHaveText('Moves: 8');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(8)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status(page, 'Moves')).toHaveText('Moves: 0');
  await expect(cards(page).nth(0)).toHaveAttribute('tabindex', '0');
  const evidence = `# Automated keyboard accessibility journey\n\nPlaywright 1.64.1; Chromium ${browser.version()}; no screen reader used.\n\nThe test completed eight pairs using only arrow keys, Enter and Space after loading np1-4-1, checked one announcement per turn, left with Tab and started a new game. Spoken output remains user acceptance.\n\n## Closed board\n\n\`\`\`yaml\n${closedTree}\n\`\`\`\n\n## First revealed face\n\n\`\`\`yaml\n${revealedTree}\n\`\`\`\n\n## Completion\n\n\`\`\`yaml\n${wonTree}\n\`\`\`\n`;
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/accessibility-journey.md', evidence);
  await info.attach('accessibility-journey', { body: evidence, contentType: 'text/markdown' });
});

test('identical consecutive misses each announce once; clocks, focus and closing do not repeat', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await observeAnnouncements(page);
  for (let turn = 1; turn <= 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await expect(page.locator('#test-announcement-log > div')).toHaveCount(turn);
    await cards(page).nth(2).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.clock.runFor(1000);
    await expect(page.locator('#test-announcement-log > div')).toHaveCount(turn);
  }
  expect(await page.locator('#test-announcement-log > div').allTextContents()).toEqual([
    'No match. Cards close after a short pause.', 'No match. Cards close after a short pause.',
  ]);
});
