import type { Page } from '@playwright/test';

export async function moveFrom(page: Page, from: number, to: number, size: number): Promise<number> {
  const horizontal = to % size - from % size;
  const vertical = Math.floor(to / size) - Math.floor(from / size);
  for (let step = 0; step < Math.abs(horizontal); step += 1) {
    await page.keyboard.press(horizontal > 0 ? 'ArrowRight' : 'ArrowLeft');
  }
  for (let step = 0; step < Math.abs(vertical); step += 1) {
    await page.keyboard.press(vertical > 0 ? 'ArrowDown' : 'ArrowUp');
  }
  return to;
}
