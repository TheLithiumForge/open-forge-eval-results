import { test, expect, cards, status, loadBoard, freezeClock } from './game.ts';

test('mouse hover, right-click, cancellation and native keyboard navigation keep game rules', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).hover();
  await cards(page).nth(0).click({ button: 'right' });
  await cards(page).nth(0).dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 2 });
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  expect((await page.locator('.board').evaluate((e) => e.querySelectorAll('button[tabindex="0"]').length))).toBe(1);
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards(page).nth(6)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(2)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(2)).toBeFocused();
  await expect(status(page, 'Moves')).toHaveText('Moves: 0');
  for (const modifier of ['Alt', 'Control', 'Meta', 'Shift']) {
    for (const key of ['ArrowRight', 'Enter', 'Space']) {
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(cards(page).nth(2)).toBeFocused();
      await expect(cards(page).nth(2)).toHaveAccessibleName(/closed$/);
    }
  }
  await page.keyboard.press('Space');
  await expect(cards(page).nth(2)).toHaveAccessibleName(/revealed$/);
  await page.keyboard.press('Enter');
  await expect(status(page, 'Moves')).toHaveText('Moves: 0');
});

test('completed touch taps share mouse and keyboard activation', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await loadBoard(page);
  await cards(page).nth(0).tap();
  await cards(page).nth(11).tap();
  await expect(status(page, 'Moves')).toHaveText('Moves: 1');
  await expect(status(page, 'Pairs')).toHaveText('Pairs: 1/8');
  await context.close();
});
