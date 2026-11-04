import { expect, test, type Page } from "@playwright/test";
import { completedSnapshot, matchingPairs, startDeal, unfinishedWinningSnapshot } from "./support.ts";

function openMismatchSnapshot(): string {
  return JSON.stringify({ version: 1, boardCode: "np1-4-1", matched: [0, 11],
    selection: { kind: "mismatch", first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true });
}

async function exportText(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Export snapshot", exact: true }).click();
  return page.getByLabel("Snapshot JSON", { exact: true }).inputValue();
}

async function setVisibility(page: Page, state: "hidden" | "visible"): Promise<void> {
  await page.evaluate((visibility) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: visibility });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

test("snapshot pause, focus, hidden visibility and the exact active mismatch boundary", async ({ page }) => {
  const clockStart = new Date("2020-01-01T00:00:00Z");
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1_000));
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const snapshot = page.getByLabel("Snapshot JSON", { exact: true });
  await snapshot.fill(openMismatchSnapshot());
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await expect(page.locator(".reproduction-status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect(page.locator(".score-strip")).toContainText("Moves: 2");

  const cards = page.locator(".memory-card");
  await cards.nth(3).click();
  await expect(page.locator(".score-strip")).toContainText("Moves: 2");
  await expect(await exportText(page)).toContain('"remainingMs": 300');
  await cards.nth(6).focus();
  await page.keyboard.press("ArrowRight");
  await expect(cards.nth(7)).toBeFocused();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(cards.nth(7)).toBeFocused();

  await page.clock.runFor(100);
  await expect(await exportText(page)).toContain('"remainingMs": 200');
  await setVisibility(page, "hidden");
  await page.clock.runFor(10_000);
  await expect(await exportText(page)).toContain('"elapsedMs": 1600');
  await expect(await exportText(page)).toContain('"remainingMs": 200');

  await setVisibility(page, "visible");
  await page.clock.runFor(199);
  await expect(await exportText(page)).toContain('"remainingMs": 1');
  await page.clock.runFor(1);
  await cards.nth(2).click();
  await expect(cards.nth(2)).toHaveAccessibleName("Row 1, column 3, cyan solid circle, marker top, revealed");
  await expect(page.locator(".score-strip")).toContainText("Moves: 2");
});

test("completed imports preserve bests and resumed imports record a local victory", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("neon-pairs.preferences.v1") === null) {
      localStorage.setItem("neon-pairs.preferences.v1", JSON.stringify({ size: 4, bestScores: { 4: 12 } }));
    }
  });
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const snapshot = page.getByLabel("Snapshot JSON", { exact: true });
  const complete = completedSnapshot("np1-4-1", 8);
  await snapshot.fill(complete);
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await expect(page.locator(".reproduction-status")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await expect(page.locator(".score-strip")).toContainText("Best: 12");
  await expect(page.locator(".win-banner")).not.toHaveClass(/is-celebrating/);
  const stored = await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"));
  expect(stored).toContain('"4":12');

  const game = unfinishedWinningSnapshot("np1-4-1");
  await snapshot.fill(game.text);
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  const [first, second] = game.finalPair;
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.locator(".memory-card").nth(second).click({ force: true });
  await expect(page.locator(".win-banner")).toBeVisible();
  await expect(page.locator(".score-strip")).toContainText("Best: 8");
  await expect(page.getByRole("status")).toHaveText("Pair found. All pairs found in 8 moves and 1:01.");
  await expect(page.locator(".memory-card").nth(first)).toHaveAttribute("aria-disabled", "true");

  await page.reload();
  await expect(page.locator(".score-strip")).toContainText("Best: 8");
  await startDeal(page, "np1-4-1");
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.waitForTimeout(850);
  for (const [missCount, pair] of matchingPairs("np1-4-1").entries()) {
    const [pairFirst, pairSecond] = pair;
    await cards.nth(pairFirst).click({ force: true });
    await cards.nth(pairSecond).click({ force: true });
    if (missCount === 0) await expect(page.locator(".score-strip")).toContainText("Moves: 2");
  }
  await expect(page.locator(".score-strip")).toContainText("Moves: 9");
  await expect(page.locator(".score-strip")).toContainText("Best: 8");

  const equalGame = unfinishedWinningSnapshot("np1-4-1");
  await snapshot.fill(equalGame.text);
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.locator(".memory-card").nth(equalGame.finalPair[1]).click({ force: true });
  await expect(page.locator(".score-strip")).toContainText("Moves: 8");
  await expect(page.locator(".score-strip")).toContainText("Best: 8");
});

test("starting a replacement deal invalidates a pending mismatch timeout", async ({ page }) => {
  const clockStart = new Date("2020-01-01T00:00:00Z");
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1_000));
  await page.goto("/");
  await startDeal(page, "np1-4-1");
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.clock.runFor(100);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await cards.nth(0).click();
  await page.clock.runFor(1_000);
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
});

test("reload remembers size and best scores while malformed or blocked storage leaves play available", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (localStorage.getItem("neon-pairs.preferences.v1") === null) {
      localStorage.setItem("neon-pairs.preferences.v1", "{");
    }
  });
  await page.goto("/");
  await expect(page.getByLabel("Grid size", { exact: true })).toHaveValue("4");
  await page.getByLabel("Grid size", { exact: true }).selectOption("8");
  await expect(page.getByLabel("Grid size", { exact: true })).toHaveValue("8");
  await page.reload();
  await expect(page.getByLabel("Grid size", { exact: true })).toHaveValue("8");
  expect(await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"))).toContain('"size":8');
  await context.close();

  const unavailable = await browser.newContext({ baseURL: "http://127.0.0.1:4173" });
  const blocked = await unavailable.newPage();
  await blocked.addInitScript(() => Object.defineProperty(window, "localStorage", { get: () => { throw new Error("blocked"); } }));
  await blocked.goto("/");
  await expect(blocked.locator(".memory-card")).toHaveCount(16);
  await blocked.locator(".memory-card").first().click();
  await expect(blocked.locator(".memory-card").first()).toHaveAccessibleName(/revealed/);
  await unavailable.close();
});
