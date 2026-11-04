import { expect, type Page } from '@playwright/test';

export async function moveTo(page: Page, from: number, to: number, size: number): Promise<void> {
  let row = Math.floor(from / size);
  let column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  while (row < targetRow) { await page.keyboard.press('ArrowDown'); row += 1; }
  while (row > targetRow) { await page.keyboard.press('ArrowUp'); row -= 1; }
  while (column < targetColumn) { await page.keyboard.press('ArrowRight'); column += 1; }
  while (column > targetColumn) { await page.keyboard.press('ArrowLeft'); column -= 1; }
  await expectFocusedCard(page, to, size);
}

export async function expectFocusedCard(page: Page, index: number, size: number): Promise<void> {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  await expect(page.getByRole('button', { name: `Row ${row}, column ${column}, closed` })).toBeFocused();
}
