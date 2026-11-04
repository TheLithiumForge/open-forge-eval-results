import { expect, test } from "@playwright/test";
import { createGame } from "../src/game/board.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { activateCard } from "../src/game/transitions.ts";
import { cardAt, finishBoardByClicks, matchingPairs, startBoard } from "./helpers.ts";

const BEST_KEY = "neon-pairs.best-moves.v1";
const SIZE_KEY = "neon-pairs.grid-size.v1";

function completedSnapshot(code: string): string {
  const initial = createGame(code);
  if (initial === null) throw new Error("The test deal is valid.");
  let state = initial;
  for (const [first, second] of matchingPairs(code)) {
    state = activateCard(activateCard(state, first), second);
  }
  return encodeSnapshot(state);
}

function unfinishedSnapshot(): string {
  const initial = createGame("np1-4-1");
  if (initial === null) throw new Error("The test deal is valid.");
  return encodeSnapshot(activateCard(initial, 0));
}

test("stores per-size best moves, keeps unrelated keys, and reloads the last size", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("other-app-key", "keep-me"));
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByText("Best: none", { exact: true })).toBeVisible();
  await startBoard(page);
  await page.getByLabel("Grid size").selectOption("6");
  await expect(page.getByText("Best: none", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SIZE_KEY)).toBe("6");

  await startBoard(page, "np1-6-1");
  await finishBoardByClicks(page, 6, 1);
  await expect(page.getByText("Moves: 19", { exact: true })).toBeVisible();
  await expect(page.getByText("Best: 19", { exact: true })).toBeVisible();

  await startBoard(page, "np1-6-1");
  await finishBoardByClicks(page, 6);
  await expect(page.getByText("Best: 18", { exact: true })).toBeVisible();

  await startBoard(page, "np1-6-1");
  await finishBoardByClicks(page, 6);
  await expect(page.getByText("Best: 18", { exact: true })).toBeVisible();

  await startBoard(page, "np1-6-1");
  await finishBoardByClicks(page, 6, 1);
  await expect(page.getByText("Best: 18", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), BEST_KEY)).toContain('"6":18');
  expect(await page.evaluate(() => localStorage.getItem("other-app-key"))).toBe("keep-me");

  await page.getByLabel("Grid size").selectOption("4");
  await expect(page.getByText("Best: none", { exact: true })).toBeVisible();
  await startBoard(page, "np1-4-1");
  await finishBoardByClicks(page, 4);
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  await page.getByLabel("Grid size").selectOption("6");
  await expect(page.getByText("Best: 18", { exact: true })).toBeVisible();
  const previousCode = await page.getByLabel("Board code").inputValue();
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  await expect(page.getByText("Best: 18", { exact: true })).toBeVisible();
  await page.getByText("Reproduce a game", { exact: true }).click();
  const reloadedCode = await page.getByLabel("Board code").inputValue();
  expect(reloadedCode).not.toBe(previousCode);
});

test("ignores corrupt saved preferences and leaves play available when storage reads fail", async ({ page }) => {
  await page.addInitScript(({ sizeKey, bestKey }) => {
    localStorage.setItem(sizeKey, "5");
    localStorage.setItem(bestKey, '{"4":1.5,"6":1000000}');
    localStorage.setItem("other-app-key", "preserve");
  }, { sizeKey: SIZE_KEY, bestKey: BEST_KEY });
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByText("Best: none", { exact: true })).toBeVisible();
  await startBoard(page);
  await cardAt(page, 0).click();
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed/);
  expect(await page.evaluate(() => localStorage.getItem("other-app-key"))).toBe("preserve");

  const unavailable = await page.context().newPage();
  await unavailable.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Blocked", "SecurityError"); },
    });
  });
  await unavailable.goto("http://127.0.0.1:4173");
  await expect(unavailable.getByLabel("Grid size")).toHaveValue("4");
  await unavailable.getByLabel("Grid size").selectOption("6");
  await expect(unavailable.getByLabel("Grid size")).toHaveValue("6");
  await unavailable.locator(".board-grid > button").nth(0).click();
  await expect(unavailable.locator(".board-grid > button").nth(0)).toHaveAttribute("aria-label", /revealed/);
  await unavailable.close();
});

test("continues when preference writes fail and preserves import scoring rules", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await page.addInitScript(({ bestKey, sizeKey }) => {
    localStorage.setItem(bestKey, JSON.stringify({ 4: 99, 6: 999 }));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key === bestKey || key === sizeKey) throw new DOMException("Full", "QuotaExceededError");
      originalSetItem.call(this, key, value);
    };
  }, { bestKey: BEST_KEY, sizeKey: SIZE_KEY });

  await page.goto("/");
  await startBoard(page, "np1-6-1");
  await expect(page.getByText("Best: 999", { exact: true })).toBeVisible();
  await cardAt(page, 0).click();
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed/);

  await page.getByLabel("Grid size").selectOption("4");
  const snapshot = page.getByLabel("Snapshot JSON");
  await snapshot.fill(completedSnapshot("np1-4-1"));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("region", { name: "Game complete" })).toBeVisible();
  await expect(page.locator(".win-banner")).not.toHaveClass(/win-celebrate/);
  await expect(page.getByText("Best: 99", { exact: true })).toBeVisible();

  await page.getByLabel("Grid size").selectOption("4");
  await snapshot.fill(unfinishedSnapshot());
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await cardAt(page, 11).click();
  await finishBoardByClicks(page, 4);
  await expect(page.getByText("Moves: 8", { exact: true })).toBeVisible();
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
});
