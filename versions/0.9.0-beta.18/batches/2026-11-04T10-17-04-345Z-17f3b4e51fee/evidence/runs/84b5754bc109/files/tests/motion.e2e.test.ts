import { expect, test } from './browser-test.ts';
import { finishBoard, loadFixedBoard } from './game-fixture.ts';

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
  await page.locator('.victory').evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await expect(page.locator('.victory')).toBeVisible();
  expect(await page.locator('.victory').evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );
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

test('changing reduced motion updates cards and stops an active celebration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadFixedBoard(page);
  const card = page.locator('.card').first();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await card.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await card.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    '0.12s',
  );
  await finishBoard(page);
  const banner = page.locator('.victory');
  await banner.evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error('Expected an active victory pulse.');
    animation.pause();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await banner.evaluate((element) => ({
      animation: getComputedStyle(element).animationName,
      active: element.getAnimations().length,
    })),
  ).toEqual({ animation: 'none', active: 0 });
  await expect(banner).toBeVisible();
  await expect(page.locator('.card.matched')).toHaveCount(16);
});
