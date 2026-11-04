import type { Locator, Page } from "@playwright/test";

export const CODE_4 = "np1-4-1";
export const MATCHES = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;

export function cards(page: Page): Locator {
  return page.locator(".neon-board-card");
}

export async function openReproduction(page: Page): Promise<void> {
  const panel = page.locator(".neon-reproduction");
  if (!(await panel.evaluate((element) => element.hasAttribute("open")))) {
    await page.getByText("Reproduce a game", { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel("Board code").fill(code);
  await page.getByRole("button", { name: "Load board" }).click();
}

export async function clickPairs(page: Page, pairs: readonly (readonly [number, number])[] = MATCHES): Promise<void> {
  for (const [first, second] of pairs) {
    await cards(page).nth(first).click();
    await cards(page).nth(second).click();
  }
}

export async function visitReproduction(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4173/");
}

export async function openWithFrozenClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("http://127.0.0.1:4173/");
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
}
