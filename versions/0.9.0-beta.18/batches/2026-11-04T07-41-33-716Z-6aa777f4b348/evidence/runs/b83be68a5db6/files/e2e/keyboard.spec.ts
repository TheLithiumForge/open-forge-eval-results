import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { loadBoard, pairs4 } from './helpers.ts';

test('complete keyboard journey produces accessibility-tree evidence', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  const evidence = [`# Keyboard accessibility evidence\n\nPlaywright 1.64.1; Chromium ${browser.version()}; Node ${process.version}.\nNo screen reader was used. Spoken confirmation remains user acceptance.\n`];
  evidence.push(`## Closed board\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\`\n`);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.card').first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.card').first()).toBeFocused();
  let current = 0;
  async function moveTo(target: number) {
    while (current % 4 < target % 4) { await page.keyboard.press('ArrowRight'); current++; }
    while (current % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); current--; }
    while (Math.floor(current / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
    while (Math.floor(current / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
  }
  for (let pair = 0; pair < pairs4.length; pair++) {
    const indices = pairs4[pair];
    if (!indices) throw new Error('Missing test pair');
    const first = indices[0];
    const second = indices[1];
    if (first === undefined || second === undefined) throw new Error('Missing pair index');
    await moveTo(first);
    await page.keyboard.press('Enter');
    await expect(page.locator('.card').nth(first)).toHaveAccessibleName(/revealed$/);
    if (pair === 0) evidence.push(`## First revealed face\n\n\`\`\`yaml\n${await page.locator('.board').ariaSnapshot()}\n\`\`\`\n`);
    await moveTo(second);
    await page.keyboard.press('Space');
    await expect(page.locator('.card').nth(second)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[aria-live]')).toHaveText(pair === 7
      ? /^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/
      : `Pair found. ${pair + 1} ${pair === 0 ? 'pair' : 'pairs'} matched.`);
  }
  await expect(page.locator('.win-banner')).toContainText('8 moves');
  evidence.push(`## Completed game\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\`\n`);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.card').nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  evidence.push('Native Tab left the board; Shift+Tab returned to its remembered card, then reached Restart and New Game. Enter started a hidden deal.\n');
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility.md', evidence.join('\n'));
});

test('identical turn results each change the live region once', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-11-04T00:01:00Z'));
  await loadBoard(page);
  const changes: string[] = [];
  await page.evaluate(() => {
    const live = document.querySelector('[aria-live]');
    if (!live) throw new Error('Missing live region');
    const observer = new MutationObserver(() => {
      // Only the test installs this observer; the game exposes no diagnostics.
      const event = new CustomEvent('announcement-observed', { detail: live.textContent });
      document.dispatchEvent(event);
    });
    observer.observe(live, { subtree: true, childList: true, characterData: true });
  });
  await page.evaluate(() => {
    document.addEventListener('announcement-observed', event => {
      if (event instanceof CustomEvent && typeof event.detail === 'string') console.info(`LIVE:${event.detail}`);
    });
  });
  page.on('console', message => { if (message.text().startsWith('LIVE:')) changes.push(message.text().slice(5)); });
  for (let i = 0; i < 2; i++) {
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(1).click();
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(1000);
  }
  expect(changes).toEqual(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']);
});
