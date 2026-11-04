import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, freezeClock, openGame } from './deal-actions.ts';

test('identical turns and load events each announce once; clocks and focus do not repeat them', async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  const monitor = await page.evaluateHandle(() => {
    const region = document.querySelector('[aria-live="polite"]');
    if (region === null) throw new Error('Missing live region');
    const results: string[] = [];
    const observer = new MutationObserver(() => {
      const text = region.textContent ?? '';
      if (text !== '') results.push(text);
    });
    observer.observe(region, { childList: true, characterData: true, subtree: true });
    return { results, observer };
  });
  for (let turn = 0; turn < 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(2000);
  }
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await page.clock.runFor(2000);
  for (let load = 0; load < 2; load += 1) {
    await page.getByLabel('Board code', { exact: true }).fill('invalid');
    await page.getByRole('button', { name: 'Load board', exact: true }).click();
  }
  const results = await monitor.evaluate(({ results, observer }) => { observer.disconnect(); return results; });
  expect(results).toEqual([
    'No match. Cards close after a short pause.', 'No match. Cards close after a short pause.',
    'Pair found. 1 pair matched.', 'Invalid board code.', 'Invalid board code.',
  ]);
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/live-announcements.json', JSON.stringify(results, null, 2));
  await monitor.dispose();
});
