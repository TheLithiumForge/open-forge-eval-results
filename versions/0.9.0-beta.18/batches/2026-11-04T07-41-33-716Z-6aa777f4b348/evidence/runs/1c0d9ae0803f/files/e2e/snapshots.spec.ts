import { expect, test } from "@playwright/test";
import { cards, CODE_4, loadBoard, openReproduction, openWithFrozenClock } from "./helpers.ts";

const PENDING_SNAPSHOT = JSON.stringify({ version: 1, boardCode: CODE_4, matched: [],
  selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 500 }, moves: 1, elapsedMs: 1_200, started: true });
const CONTINUED_SNAPSHOT = JSON.stringify({ version: 1, boardCode: CODE_4, matched: [2, 6],
  selection: { kind: "one", index: 0 }, moves: 1, elapsedMs: 500, started: true });
const COMPLETED_SNAPSHOT = JSON.stringify({ version: 1, boardCode: CODE_4, matched: Array.from({ length: 16 }, (_, i) => i),
  selection: { kind: "closed" }, moves: 8, elapsedMs: 3_600_000, started: true });
const FINAL_MATCH_AT_CAP = JSON.stringify({ version: 1, boardCode: CODE_4,
  matched: [0, 1, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  selection: { kind: "one", index: 2 }, moves: 999_999, elapsedMs: 0, started: true });
const scores = JSON.stringify({ version: 1, scores: { "4": 12 } });

test("unfinished snapshot pauses, allows navigation, resumes, and preserves mismatch time", async ({ page }) => {
  await openWithFrozenClock(page);
  await openReproduction(page);
  const textarea = page.getByLabel("Snapshot JSON");
  await textarea.fill(PENDING_SNAPSHOT);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".neon-control-status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  await cards(page).nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(cards(page).nth(1)).toBeFocused();
  await cards(page).nth(2).click();
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(cards(page).nth(2)).toBeFocused();

  const focusGeometry = await cards(page).nth(2).evaluate((card) => {
    const box = card.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, viewport: window.innerHeight };
  });
  expect(focusGeometry.top).toBeGreaterThanOrEqual(0);
  expect(focusGeometry.bottom).toBeLessThanOrEqual(focusGeometry.viewport);
  await page.clock.runFor(499);
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(1);
  await cards(page).nth(2).click();
  await expect(cards(page).nth(2)).toHaveAttribute("aria-label", /revealed$/);
  await cards(page).nth(6).click();
  await expect(page.getByText("Moves: 2", { exact: true })).toBeVisible();
});

test("invalid drafts keep the current game and valid loads clear status and select size", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await loadBoard(page, CODE_4);
  await cards(page).nth(0).click();
  await openReproduction(page);
  const codeInput = page.getByLabel("Board code");
  await codeInput.fill("np1-4-01");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".neon-control-status")).toHaveText("Invalid board code.");
  await expect(codeInput).toHaveValue("np1-4-01");
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByRole("combobox", { name: "Grid size" })).toHaveValue("4");

  await codeInput.fill(" np1-6-1 ");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.getByRole("combobox", { name: "Grid size" })).toHaveValue("6");
  await expect(cards(page)).toHaveCount(36);
  await expect(page.locator(".neon-control-status")).toHaveText("");
  await expect(codeInput).toHaveValue("np1-6-1");
  await expect(page.getByRole("button", { name: "Load board" })).toBeFocused();

  const snapshot = page.getByLabel("Snapshot JSON");
  await snapshot.fill("{");
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".neon-control-status")).toHaveText("Invalid snapshot.");
  await expect(snapshot).toHaveValue("{");
  await expect(page.getByRole("combobox", { name: "Grid size" })).toHaveValue("6");
  await expect(cards(page)).toHaveCount(36);
});

test("snapshot export is readable; completed import stays static and does not change best", async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem("neonPairs.bestScores.v1", value), scores);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:4173/");
  await loadBoard(page, CODE_4);
  await cards(page).nth(0).click();
  await openReproduction(page);
  const snapshot = page.getByLabel("Snapshot JSON");
  await page.getByRole("button", { name: "Export snapshot" }).click();
  expect(JSON.parse(await snapshot.inputValue())).toMatchObject({ boardCode: CODE_4,
    selection: { kind: "one", index: 0 }, started: true });
  await snapshot.fill(COMPLETED_SNAPSHOT);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".neon-control-status")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
  await expect(page.locator(".neon-win-banner")).not.toHaveClass(/--pulse/);
  await expect(page.getByText("Finished in 8 moves and 60:00.", { exact: true })).toBeVisible();
  await expect(page.getByText("Best: 12", { exact: true })).toBeVisible();
});

test("winning after an unfinished import saves a best score", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await openReproduction(page);
  await page.getByLabel("Snapshot JSON").fill(CONTINUED_SNAPSHOT);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await cards(page).nth(11).click();
  await expect(page.getByText("Pairs: 2/8", { exact: true })).toBeVisible();
  const remainingPairs = [[1, 9], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;
  for (const [first, second] of remainingPairs) {
    await cards(page).nth(first).click();
    await cards(page).nth(second).click();
  }
  await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
});

test("a final pair still completes and announces at the move cap", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await openReproduction(page);
  await page.getByLabel("Snapshot JSON").fill(FINAL_MATCH_AT_CAP);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await cards(page).nth(6).click();
  await expect(page.getByText("Moves: 999999", { exact: true })).toBeVisible();
  await expect(page.getByText("Pairs: 8/8", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Pair found. All pairs found in 999999 moves and ");
  await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
});
