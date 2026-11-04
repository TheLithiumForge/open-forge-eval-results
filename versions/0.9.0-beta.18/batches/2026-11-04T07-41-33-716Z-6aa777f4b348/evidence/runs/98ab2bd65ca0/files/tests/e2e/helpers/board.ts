import type { Page } from "@playwright/test";

export async function freezePageTime(page: Page): Promise<void> {
  const start = new Date("2027-01-01T00:00:00Z");
  const paused = new Date("2027-01-01T00:00:01Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(paused);
}

export async function moveFocusWithArrows(
  page: Page,
  size: number,
  from: number,
  to: number,
): Promise<void> {
  let row = Math.floor(from / size);
  let column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  while (column !== targetColumn) {
    const direction = column < targetColumn ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.press(direction);
    column += column < targetColumn ? 1 : -1;
  }
  while (row !== targetRow) {
    const direction = row < targetRow ? "ArrowDown" : "ArrowUp";
    await page.keyboard.press(direction);
    row += row < targetRow ? 1 : -1;
  }
}
