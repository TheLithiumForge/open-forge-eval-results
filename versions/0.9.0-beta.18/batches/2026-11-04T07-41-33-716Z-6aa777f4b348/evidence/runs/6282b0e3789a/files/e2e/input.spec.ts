import { expect, test } from '@playwright/test';
import { cards, freezeClock, live, loadBoard } from './gameFixtures.ts';

declare global { interface Window { recordLiveMutation?: (text: string) => Promise<void> } }

test('hidden cards expose only their position, and pointer non-activations preserve play', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await expect(page.locator('.board-grid svg')).toHaveCount(0);
  const hidden = await cards(page).evaluateAll(elements => elements.map(element => ({
    name: element.getAttribute('aria-label'),
    attributes: [...element.attributes].map(attribute => attribute.name),
  })));
  hidden.forEach((card, index) => {
    expect(card.name).toBe(`Row ${Math.floor(index / 4) + 1}, column ${index % 4 + 1}, closed`);
    expect(card.attributes.some(name => /face|seed|deck/i.test(name))).toBe(false);
  });
  await cards(page).nth(0).hover();
  await cards(page).nth(0).click({ button: 'right' });
  await cards(page).nth(0).dispatchEvent('pointercancel');
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(0).click();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await expect(page.locator('.board-grid svg.card-face')).toHaveCount(1);
});

test('consecutive identical misses each update the one atomic region only once', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(live(page)).toHaveAttribute('aria-atomic', 'true');
  const updates: string[] = [];
  await page.exposeFunction('recordLiveMutation', (text: string) => { updates.push(text); });
  await live(page).evaluate(region => {
    const observer = new MutationObserver(() => {
      void window.recordLiveMutation?.(region.textContent ?? '');
    });
    observer.observe(region, { childList: true, subtree: true, characterData: true });
  });
  for (let turn = 0; turn < 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await expect(live(page)).toHaveText('No match. Cards close after a short pause.');
    await cards(page).nth(3).focus();
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(800);
  }
  expect(updates).toEqual(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']);
});

test('completed taps use the same card action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadBoard(page);
  await cards(page).nth(0).tap();
  await cards(page).nth(11).tap();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await context.close();
});
