import { expect, test } from '@playwright/test';
import { completedSnapshot, DEFAULT_CODE, freezePageClock, gamePairs, loadBoard, loadSnapshot, moveFocus, observeAnnouncements } from './helpers.ts';
import { captureFaceSheet, saveEvidence, saveScreenshot } from './evidence.ts';

test('four-by-four keyboard journey exposes each turn, one live result, and the final win', async ({ page }) => {
  await freezePageClock(page);
  await page.goto('/');
  expect(await page.locator('main').ariaSnapshot()).toContain('Neon Pairs');
  await observeAnnouncements(page);
  await loadBoard(page, DEFAULT_CODE);

  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Row 1, column 1, closed/ })).toBeFocused();

  const journey: string[] = [];
  journey.push(`## Initial board\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\``);
  const status = page.getByRole('status');
  const cards = page.locator('.memory-card');
  const board = gamePairs(DEFAULT_CODE);
  const firstPair = board[0];
  if (firstPair === undefined) throw new Error('Test deck has no pairs.');
  await moveFocus(page, 0, firstPair.first, 4);
  await page.keyboard.press('Enter');
  await expect(cards.nth(firstPair.first)).toHaveAttribute('aria-label', /revealed$/);
  journey.push(`## Revealed card\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\``);
  await moveFocus(page, firstPair.first, firstPair.second, 4);
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('Pair found. 1 pair matched.');
  journey.push(`## First match\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\``);

  const firstMiss = board.find((pair) => pair !== firstPair);
  const secondMiss = board.find((pair) => pair !== firstPair && pair !== firstMiss);
  if (firstMiss === undefined || secondMiss === undefined) throw new Error('Test deck has no unused pairs.');
  await moveFocus(page, firstPair.second, firstMiss.first, 4);
  await page.keyboard.press('Enter');
  await moveFocus(page, firstMiss.first, secondMiss.first, 4);
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('No match. Cards close after a short pause.');
  journey.push(`## Mismatch\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\``);
  await page.clock.runFor(800);
  const secondFailure = board.find((pair) =>
    pair !== firstPair && pair !== firstMiss && pair !== secondMiss,
  );
  if (secondFailure === undefined) throw new Error('Test deck has too few pairs.');
  await moveFocus(page, secondMiss.first, secondFailure.first, 4);
  await page.keyboard.press('Enter');
  const differingFace = board.find((pair) =>
    pair !== firstPair && pair !== firstMiss && pair !== secondMiss && pair !== secondFailure,
  );
  if (differingFace === undefined) throw new Error('Test deck has too few unused pairs.');
  await moveFocus(page, secondFailure.first, differingFace.first, 4);
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('No match. Cards close after a short pause.');
  await page.clock.runFor(800);

  let current = differingFace.first;
  for (const pair of board) {
    if (pair === firstPair) continue;
    await moveFocus(page, current, pair.first, 4);
    await page.keyboard.press('Enter');
    await moveFocus(page, pair.first, pair.second, 4);
    await page.keyboard.press('Enter');
    current = pair.second;
  }
  await expect(page.getByRole('heading', { name: 'Every pair found' })).toBeVisible();
  await expect(status).toHaveText('Pair found. All pairs found in 10 moves and 0:01.');
  await expect(page.getByText('Pairs: 8/8')).toBeVisible();
  await expect(page.getByText('Moves: 10')).toBeVisible();
  journey.push(`## Completed game\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\``);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0')).toBeVisible();
  journey.push(`## Board exit and next game\n\nFocus after starting another game by keyboard: ${await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? document.activeElement?.tagName)}\n\n\`\`\`yaml\n${await page.locator('main').ariaSnapshot()}\n\`\`\``);

  const eventText = await page.evaluate(() => document.documentElement.dataset.testAnnouncements ?? '');
  const events = eventText.split('\n');
  expect(events).toHaveLength(11);
  expect(events).toContain('Board loaded.');
  expect(events).toContain('Pair found. 1 pair matched.');
  expect(events.filter((event) => event === 'No match. Cards close after a short pause.')).toHaveLength(2);
  expect(events).toContain('Pair found. All pairs found in 10 moves and 0:01.');
  const record = await page.evaluate(() => ({ browser: navigator.userAgent, screenReaderUsed: false }));
  const accessibilityRecord = [
    '# Keyboard accessibility evidence',
    '',
    `Browser: ${record.browser}`,
    'Automation: Playwright 1.64.1, Chromium 156.0.8078.4',
    'Journey: 4×4 keyboard game using native buttons, arrow keys, Enter, and Tab.',
    'Screen reader used: No. Spoken output remains for user acceptance.',
    '',
    ...journey,
    '',
  ].join('\n');
  await saveEvidence('accessibility.md', accessibilityRecord);
  await saveScreenshot(page, 'keyboard-journey.png');
});

test('a loaded completed game shows all 128 accessible faces at 44px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await loadSnapshot(page, completedSnapshot('np1-16-1'));
  await expect(page.locator('.memory-card')).toHaveCount(256);
  expect(await captureFaceSheet(page, 'facesheet.png')).toBe(128);
  const snapshot = await page.evaluate(() => ({
    widths: Array.from(document.querySelectorAll('.memory-card')).map((card) => card.getBoundingClientRect().width),
    names: Array.from(document.querySelectorAll('.memory-card')).map((card) => card.getAttribute('aria-label')),
    hasCanvas: document.querySelector('canvas') !== null,
  }));
  expect(snapshot.widths.every((width) => width >= 44)).toBe(true);
  expect(snapshot.hasCanvas).toBe(false);
  expect(snapshot.names.every((name) => name !== null && name.endsWith(', matched'))).toBe(true);
  expect(await page.locator('button[aria-disabled="true"]').count()).toBe(256);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  const hidden = await page.locator('.memory-card').evaluateAll((buttons) => buttons.every((button) => {
    const label = button.getAttribute('aria-label');
    return label?.endsWith(', closed') === true && !button.innerHTML.includes('card-face') && !button.innerHTML.includes('faceId');
  }));
  expect(hidden).toBe(true);
});
