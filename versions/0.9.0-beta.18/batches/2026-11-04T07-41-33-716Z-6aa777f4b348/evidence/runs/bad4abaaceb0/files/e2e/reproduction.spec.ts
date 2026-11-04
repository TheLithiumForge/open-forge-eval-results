import { expect, test } from "@playwright/test";
import { cardButtons, completedSnapshot, loadBoard, loadSnapshot, mismatchFor, deckFor, oneCardSnapshot, pairsFor, revealPairs, REPLAYABLE_CODE } from "./support.ts";
import { decodeSnapshot } from "../src/game/snapshot.ts";

test("invalid loads keep board, move count, size, and drafts", async ({ page }) => {
  await page.goto("/");
  await loadBoard(page, REPLAYABLE_CODE);
  const cards = cardButtons(page);
  await cards.nth(0).click();
  const nameBefore = await cards.nth(0).getAttribute("aria-label");
  await page.getByLabel("Board code").fill("  invalid board code  ");
  await expect(page.getByLabel("Board code")).toHaveAttribute("maxlength", "32");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".control-status")).toHaveText("Invalid board code.");
  await expect(cards.nth(0)).toHaveAttribute("aria-label", nameBefore ?? "");
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await expect(page.getByLabel("Board code")).toHaveValue("  invalid board code  ");

  await page.getByLabel("Snapshot JSON").fill("not json");
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".control-status")).toHaveText("Invalid snapshot.");
  await expect(cards.nth(0)).toHaveAttribute("aria-label", nameBefore ?? "");
  await expect(page.getByLabel("Snapshot JSON")).toHaveValue("not json");
  await page.getByLabel("Snapshot JSON").fill(" ".repeat(65536));
  await expect(page.getByLabel("Snapshot JSON")).toHaveValue(" ".repeat(65536));
});

test("imports pause mismatch time, block activation, and resume remembered focus", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const deck = deckFor(REPLAYABLE_CODE);
  const [first, second] = mismatchFor(deck);
  const snapshot = JSON.stringify({
    version: 1,
    boardCode: REPLAYABLE_CODE,
    matched: [],
    selection: { kind: "mismatch", first, second, remainingMs: 500 },
    moves: 1,
    elapsedMs: 1000,
    started: true,
  });
  await loadSnapshot(page, snapshot);
  await expect(page.getByRole("status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(cardButtons(page).nth(first)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.fastForward(700);
  await expect(cardButtons(page).nth(first)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Export snapshot" }).click();
  const pausedSnapshotText = await page.getByLabel("Snapshot JSON").inputValue();
  expect(pausedSnapshotText).toContain('"remainingMs": 500');
  expect(pausedSnapshotText).toContain('"elapsedMs": 1000');

  await cardButtons(page).nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(cardButtons(page).nth(1)).toBeFocused();
  await cardButtons(page).nth(3).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(cardButtons(page).nth(3)).toBeFocused();
  await page.clock.runFor(500);
  await expect(cardButtons(page).nth(first)).toHaveAttribute("aria-label", /closed$/);
  await expect(cardButtons(page).nth(second)).toHaveAttribute("aria-label", /closed$/);
});

test("pauses a live mismatch when the page becomes hidden", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await loadBoard(page, REPLAYABLE_CODE);
  const [first, second] = mismatchFor(deckFor(REPLAYABLE_CODE));
  await cardButtons(page).nth(first).click();
  await cardButtons(page).nth(second).click();
  await page.clock.fastForward(200);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("button", { name: "Export snapshot" }).click();
  const beforePause = decodeSnapshot(await page.getByLabel("Snapshot JSON").inputValue());
  if (!beforePause || beforePause.selection.kind !== "mismatch") throw new Error("Expected an active mismatch");
  await page.clock.fastForward(1200);
  await expect(cardButtons(page).nth(first)).toHaveAttribute("aria-label", /revealed$/);
  await page.getByRole("button", { name: "Export snapshot" }).click();
  const afterPause = decodeSnapshot(await page.getByLabel("Snapshot JSON").inputValue());
  if (!afterPause || afterPause.selection.kind !== "mismatch") throw new Error("Expected the paused mismatch");
  expect(afterPause.selection.remainingMs).toBe(beforePause.selection.remainingMs);
  expect(afterPause.elapsedMs).toBe(beforePause.elapsedMs);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(afterPause.selection.remainingMs + 50);
  await expect(cardButtons(page).nth(first)).toHaveAttribute("aria-label", /closed$/);
  await expect(cardButtons(page).nth(second)).toHaveAttribute("aria-label", /closed$/);
});

test("Restart and New Game clear mismatches without stale timer updates", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await loadBoard(page, REPLAYABLE_CODE);
  const [first, second] = mismatchFor(deckFor(REPLAYABLE_CODE));
  await cardButtons(page).nth(first).click();
  await cardButtons(page).nth(second).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await page.clock.fastForward(799);
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await cardButtons(page).nth(4).click();
  await expect(cardButtons(page).nth(4)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.fastForward(1000);
  await expect(cardButtons(page).nth(4)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.locator(".board-scroll")).toHaveCount(1);

  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByText("Moves: 0")).toBeVisible();
  const firstCode = await page.getByLabel("Board code").inputValue();
  const nextMismatch = mismatchFor(deckFor(firstCode));
  await cardButtons(page).nth(nextMismatch[0]).click();
  await cardButtons(page).nth(nextMismatch[1]).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByLabel("Board code")).not.toHaveValue(firstCode);
  await cardButtons(page).nth(4).click();
  await expect(cardButtons(page).nth(4)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.locator(".board-scroll")).toHaveCount(1);
  await expect(cardButtons(page).nth(4)).toHaveAttribute("aria-label", /revealed$/);
});

test("completed snapshot loads statically without changing best scores", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("neon-pairs.preferences.v1") === null) {
      localStorage.setItem("neon-pairs.preferences.v1", JSON.stringify({ size: 4, bests: { "4": 9 } }));
    }
  });
  await page.goto("/");
  await loadSnapshot(page, completedSnapshot(REPLAYABLE_CODE, 6000));
  await expect(page.getByRole("status")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByText("Best: 9")).toBeVisible();
  await expect(page.locator(".win-banner")).toBeVisible();
  await expect(page.locator(".win-banner")).not.toHaveClass(/pulse/);
  await expect(cardButtons(page)).toHaveCount(16);
  const saved = await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"));
  expect(saved).toContain('"4":9');
  expect(saved).toContain('"size":4');
});

test("replaces a completed board when starting a new game", async ({ page }) => {
  await page.goto("/");
  await loadSnapshot(page, completedSnapshot(REPLAYABLE_CODE));
  await expect(page.locator(".board-scroll")).toHaveCount(1);
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator(".board-scroll")).toHaveCount(1);
  await expect(cardButtons(page)).toHaveCount(16);
});

test("trims valid board codes and remembers successful loaded sizes", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("  np1-6-42  ");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(page.getByLabel("Board code")).toHaveValue("np1-6-42");
  await expect(cardButtons(page)).toHaveCount(36);
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(cardButtons(page)).toHaveCount(36);
  const reloadedCode = await page.getByLabel("Board code").inputValue();
  expect(reloadedCode).toMatch(/^np1-6-[1-9][0-9]*$/);
  expect(reloadedCode).not.toBe("np1-6-42");

  await loadSnapshot(page, completedSnapshot("np1-10-7"));
  await expect(page.getByLabel("Grid size")).toHaveValue("10");
  await expect(cardButtons(page)).toHaveCount(100);
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("10");
  await expect(cardButtons(page)).toHaveCount(100);
});

test("completing a resumed unfinished game records its local best", async ({ page }) => {
  await page.goto("/");
  const deck = deckFor(REPLAYABLE_CODE);
  const finalPair = pairsFor(deck).at(-1);
  if (!finalPair) throw new Error("Expected a final pair");
  await loadSnapshot(page, oneCardSnapshot(REPLAYABLE_CODE));
  await expect(page.getByText("Best: none")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await cardButtons(page).nth(finalPair[0]).focus();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(cardButtons(page).nth(finalPair[0])).toBeFocused();
  await cardButtons(page).nth(finalPair[1]).click();
  await expect(page.getByText("Pairs: 8/8")).toBeVisible();
  await expect(page.getByText("Best: 8")).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"));
  expect(saved).toContain('"4":8');
});

