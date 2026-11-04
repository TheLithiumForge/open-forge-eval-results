import { expect, test } from './browser-test.ts';
import { finishBoard, loadFixedBoard } from './game-fixture.ts';

test('playing and completing a game never creates audio', async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => {
      throw new Error('The game must stay silent.');
    };
    Object.defineProperty(window, 'AudioContext', { value: fail });
    Object.defineProperty(window, 'webkitAudioContext', { value: fail });
    Object.defineProperty(window, 'Audio', { value: fail });
  });
  await loadFixedBoard(page);
  await finishBoard(page);
  await expect(page.locator('.victory')).toBeVisible();
});
