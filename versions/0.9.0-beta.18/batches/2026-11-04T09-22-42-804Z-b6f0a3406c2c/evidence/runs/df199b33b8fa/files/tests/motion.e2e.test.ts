import { expect, test } from './browser-test.ts';
import { exportedSnapshot, finishBoard, loadFixedBoard } from './game-fixture.ts';

test('card transitions use 120ms and a completed game has one 600ms pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadFixedBoard(page);
  const transitions = await page
    .locator('.card')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { duration: style.transitionDuration, property: style.transitionProperty };
    });
  expect(transitions.duration.split(',').every((duration) => parseFloat(duration) === 0.12)).toBe(
    true,
  );
  expect(transitions.property.split(',').map((value) => value.trim())).toEqual(['border-color']);
  await finishBoard(page);
  const pulse = await page.locator('.victory').evaluate((element) => {
    const style = getComputedStyle(element);
    return { duration: style.animationDuration, iterations: style.animationIterationCount };
  });
  expect(parseFloat(pulse.duration)).toBe(0.6);
  expect(Number(pulse.iterations)).toBe(1);
  await expect
    .poll(() => page.locator('.victory').evaluate((element) => element.getAnimations().length))
    .toBe(0);
  await expect(page.locator('.victory')).toHaveCSS('opacity', '1');
});

test('reduced motion removes card transitions and completion animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadFixedBoard(page);
  await expect(page.locator('.card').first()).toHaveCSS('transition-duration', '0s');
  await finishBoard(page);
  await expect(page.locator('.victory')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.victory')).toHaveCSS('opacity', '1');
  await expect(page.locator('.victory')).toContainText('Every pair found in 8 moves');
  expect(await page.locator('.victory').evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );
});

test('motion preference changes apply without reloading or changing game progress', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadFixedBoard(page);
  const card = page.locator('.card').first();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(card).toHaveCSS('transition-duration', '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(card).toHaveCSS('transition-duration', '0.12s');
  await finishBoard(page);
  const completed = await exportedSnapshot(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(card).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.victory')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.victory')).toHaveCSS('opacity', '1');
  expect(await page.locator('.victory').evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );
  expect(await exportedSnapshot(page)).toEqual(completed);
});
