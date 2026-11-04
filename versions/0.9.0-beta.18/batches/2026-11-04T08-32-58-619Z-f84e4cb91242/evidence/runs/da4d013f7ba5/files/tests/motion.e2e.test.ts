import { expect, test } from './browser-test.ts';
import { finishBoard, loadFixedBoard } from './game-fixture.ts';

test('card transitions and the single completion pulse respond to motion preference changes', async ({
  page,
}) => {
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.card').first()).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.victory')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.victory')).toBeVisible();
});

test('reduced motion removes card transitions and completion animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadFixedBoard(page);
  await finishBoard(page);
  expect(
    await page.locator('.victory').evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  expect(
    parseFloat(
      await page
        .locator('.card')
        .first()
        .evaluate((element) => getComputedStyle(element).transitionDuration),
    ),
  ).toBe(0);
});
