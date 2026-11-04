import { expect, test } from '@playwright/test';
import { cards, loadSnapshot, nearWin } from './gameDriver.ts';

for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`completion motion respects ${reducedMotion}`, async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion });
  const page = await context.newPage();
  await page.goto('/');
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  const motion = await page.locator('.win-banner').evaluate((element) => {
    const style = getComputedStyle(element);
    return { name: style.animationName, duration: style.animationDuration, iterations: style.animationIterationCount };
  });
  if (reducedMotion === 'reduce') {
    expect(motion.name).toBe('none');
    expect(await cards(page).nth(0).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  } else {
    expect(motion).toEqual({ name: 'win-pulse', duration: '0.6s', iterations: '1' });
    expect(await cards(page).nth(0).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0.12s');
    await expect.poll(() => page.locator('.win-banner').evaluate((element) => element.getAnimations().length)).toBe(0);
  }
  await expect(page.locator('.win-banner')).toBeVisible();
  await context.close();
});
