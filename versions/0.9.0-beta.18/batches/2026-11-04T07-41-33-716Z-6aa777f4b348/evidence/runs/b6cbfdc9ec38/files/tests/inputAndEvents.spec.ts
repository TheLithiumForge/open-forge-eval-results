import { expect, test } from '@playwright/test';
import { cards, finish, live, loadBoard, openGame } from './gameHarness.ts';

test('native pointer actions reveal only on activation and hidden DOM stays private', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  const closed = await cards(page).evaluateAll((elements) => elements.map((element) => element.outerHTML));
  for (const html of closed) {
    expect(html).not.toMatch(/data-face|face-id|marker|solid|outline|circle|cyan|magenta/);
    expect(html).toContain('card-back');
    expect(html).not.toContain('<circle');
  }
  const first = cards(page).nth(0);
  await first.hover(); await first.dispatchEvent('pointercancel', { pointerType: 'touch' });
  await first.click({ button: 'right' }); await page.keyboard.press('Escape');
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await first.click(); await expect(first).toHaveClass('card card--revealed');
  await first.click(); await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(first).toHaveAttribute('aria-disabled', 'true');
  await first.focus(); await page.keyboard.press('Enter');
  await expect(first).toBeFocused();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
});

test('one atomic live event per result including identical consecutive misses', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(live(page)).toHaveAttribute('aria-atomic', 'true');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    if (!region) throw new Error('Missing live region.');
    const events: string[] = [];
    const output = document.createElement('output'); output.id = 'test-event-evidence'; output.hidden = true;
    document.body.append(output);
    new MutationObserver(() => {
      events.push(region.textContent ?? ''); output.textContent = JSON.stringify(events);
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });
  for (let miss = 0; miss < 2; miss += 1) {
    await cards(page).nth(0).click({ force: true }); await cards(page).nth(1).click({ force: true });
    await page.keyboard.press('ArrowRight'); await page.clock.runFor(800);
  }
  expect(await page.locator('#test-event-evidence').textContent()).toBe(JSON.stringify([
    'No match. Cards close after a short pause.', 'No match. Cards close after a short pause.',
  ]));
  await finish(page);
  const text = await page.locator('#test-event-evidence').textContent();
  const events: unknown = JSON.parse(text ?? 'null');
  expect(events).toHaveLength(10);
  expect(events).toEqual(expect.arrayContaining(['Pair found. All pairs found in 10 moves and 0:01.']));
  await page.clock.runFor(1000); await page.keyboard.press('ArrowLeft');
  expect(await page.locator('#test-event-evidence').textContent()).toBe(text);
  await page.getByLabel('Board code').fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid board code.');
});

test.describe('touch', () => {
  test.use({ hasTouch: true });
  test('completed taps use the same card action', async ({ page }) => {
    await openGame(page); await loadBoard(page);
    await cards(page).nth(0).tap(); await cards(page).nth(11).tap();
    await expect(page.locator('.card--matched')).toHaveCount(2);
    await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  });
});
