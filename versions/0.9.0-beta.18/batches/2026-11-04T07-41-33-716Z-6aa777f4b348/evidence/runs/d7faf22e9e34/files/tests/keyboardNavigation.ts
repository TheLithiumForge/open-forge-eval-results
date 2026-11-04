import type { Page } from '@playwright/test';

export async function moveKeyboard(page: Page, current: number, target: number, size: number): Promise<number> {
  while (Math.floor(current / size) < Math.floor(target / size)) {
    await page.keyboard.press('ArrowDown'); current += size;
  }
  while (Math.floor(current / size) > Math.floor(target / size)) {
    await page.keyboard.press('ArrowUp'); current -= size;
  }
  while (current % size < target % size) { await page.keyboard.press('ArrowRight'); current += 1; }
  while (current % size > target % size) { await page.keyboard.press('ArrowLeft'); current -= 1; }
  return current;
}
