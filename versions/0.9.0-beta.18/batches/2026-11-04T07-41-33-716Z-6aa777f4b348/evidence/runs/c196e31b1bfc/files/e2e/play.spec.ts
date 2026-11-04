import { expect, test } from "@playwright/test";
import { loadBoard, loadSnapshot, openReproduction, startAt } from "./support.ts";

test("a repeated reveal is free, a mismatch ignores activations, and pairs match", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await startAt(page);
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await cards.nth(0).click();
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await cards.nth(1).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await expect(page.getByText("No match. Cards close after a short pause.", { exact: true })).toBeVisible();
  await cards.nth(2).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await page.clock.runFor(799);
  await expect(cards.nth(0)).toHaveAttribute("aria-pressed", "true");
  await page.clock.runFor(1);
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  await cards.nth(2).click();
  await cards.nth(6).click();
  await expect(page.getByText("Moves: 2")).toBeVisible();
  await expect(page.getByText("Pairs: 1/8")).toBeVisible();
  await expect(cards.nth(2)).toHaveAttribute("aria-disabled", "true");
});

test("each identical miss is announced once; focus and turn closure add no announcement", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await startAt(page);
  const live = page.locator('[aria-live="polite"]');
  await live.evaluate((region) => {
    region.setAttribute("data-announcements", "0");
    const observer = new MutationObserver((entries) => {
      const additions = entries.reduce((total, entry) => total + entry.addedNodes.length, 0);
      const count = Number(region.getAttribute("data-announcements")) + additions;
      region.setAttribute("data-announcements", String(count));
    });
    observer.observe(region, { childList: true, subtree: true });
  });
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(live).toHaveText("No match. Cards close after a short pause.");
  await expect(live).toHaveAttribute("data-announcements", "1");
  await page.clock.runFor(800);
  await expect(live).toHaveAttribute("data-announcements", "1");
  await cards.nth(2).focus();
  await page.keyboard.press("ArrowRight");
  await expect(cards.nth(3)).toBeFocused();
  await expect(live).toHaveAttribute("data-announcements", "1");
  await cards.nth(2).click();
  await cards.nth(3).click();
  await expect(live).toHaveText("No match. Cards close after a short pause.");
  await expect(live).toHaveAttribute("data-announcements", "2");
});

test("bad reproduction drafts keep the game; successful loads keep focus", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await startAt(page);
  const cards = page.locator(".memory-card");
  await cards.nth(0).click();
  await openReproduction(page);
  const boardCode = page.getByLabel("Board code");
  await boardCode.fill("np1-6-1");
  await cards.nth(1).click();
  await expect(boardCode).toHaveValue("np1-6-1");
  await boardCode.fill("np1-4-01");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".visible-status")).toHaveText("Invalid board code.");
  await expect(boardCode).toHaveValue("np1-4-01");
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  const snapshot = page.getByLabel("Snapshot JSON");
  await snapshot.fill("{");
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".visible-status")).toHaveText("Invalid snapshot.");
  await expect(snapshot).toHaveValue("{");
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  await loadBoard(page, "np1-6-1");
  await expect(page.getByRole("button", { name: "Load board" })).toBeFocused();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
});

test("document visibility pauses the clock and resumes the remaining mismatch time", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await page.goto("/");
  await loadSnapshot(page, {
    version: 1,
    boardCode: "np1-4-1",
    matched: [],
    selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 300 },
    moves: 1,
    elapsedMs: 1_000,
    started: true,
  });
  const cards = page.locator(".memory-card");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(5_000);
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  await expect(page.getByText("Time: 0:01")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(299);
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  await expect(page.getByText("Time: 0:01")).toBeVisible();
});

test("hover, right click, and pointer cancellation leave a card closed", async ({ page }) => {
  await startAt(page);
  const first = page.locator(".memory-card").nth(0);
  await first.hover();
  await first.click({ button: "right" });
  await first.dispatchEvent("pointercancel", { pointerType: "touch" });
  await expect(first).toHaveAccessibleName("Row 1, column 1, closed");
  await expect(page.getByText("Moves: 0")).toBeVisible();
});

test("a paused imported mismatch permits navigation, then Resume restores focus and its full interval", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await page.goto("/");
  await loadSnapshot(page, {
    version: 1,
    boardCode: "np1-4-1",
    matched: [],
    selection: { kind: "mismatch", first: 0, second: 1, remainingMs: 300 },
    moves: 1,
    elapsedMs: 1_000,
    started: true,
  });
  const cards = page.locator(".memory-card");
  await cards.nth(5).focus();
  await page.keyboard.press("ArrowRight");
  await expect(cards.nth(6)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await expect(cards.nth(6)).toHaveAccessibleName("Row 2, column 3, closed");
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  await expect(page.getByText("Time: 0:01")).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(cards.nth(6)).toBeFocused();
  await page.clock.runFor(299);
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
  await expect(cards.nth(6)).toHaveAccessibleName("Row 2, column 3, closed");
});

test("New Game and Restart invalidate a previous mismatch deadline", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await startAt(page);
  const cards = page.locator(".memory-card");
  for (const control of ["New Game", "Restart"]) {
    await loadBoard(page, "np1-4-1");
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.clock.runFor(400);
    await page.getByRole("button", { name: control }).click();
    await expect(page.getByText("Moves: 0")).toBeVisible();
    await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed");
    await page.clock.runFor(200);
    await cards.nth(2).click();
    await expect(cards.nth(2)).toHaveAccessibleName(/revealed/);
    await page.clock.runFor(200);
    await expect(cards.nth(2)).toHaveAccessibleName(/revealed/);
  }
});

test("hidden face identities stay out of markup until the card is revealed", async ({ page }) => {
  await startAt(page);
  const card = page.locator(".memory-card").first();
  await expect(card).toHaveAccessibleName("Row 1, column 1, closed");
  await expect(card.locator(".face-art")).toHaveCount(0);
  expect(await card.getAttribute("data-face-id")).toBeNull();
  await card.click();
  await expect(card.locator(".face-art")).toHaveCount(1);
  await expect(card).toHaveAccessibleName(/marker .* revealed/);
});
