import { expect, test } from '@playwright/test';
import { cards, openGame } from './deal-actions.ts';
import { loadSnapshot, nearlyCompletedSnapshot } from './snapshot-actions.ts';

test('completion pulses once for 600ms and then remains static', async ({ page }) => {
  await openGame(page);
  await loadSnapshot(page, nearlyCompletedSnapshot());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  const banner = page.getByRole('region', { name: 'Game complete' });
  expect(await banner.evaluate(element => {
    const style = getComputedStyle(element);
    return [style.animationName, style.animationDuration, style.animationIterationCount];
  })).toEqual(['win-pulse', '0.6s', '1']);
  await expect.poll(() => banner.evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(banner).toBeVisible();
});

test('reduced motion disables borders and completion animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page);
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await loadSnapshot(page, nearlyCompletedSnapshot());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
