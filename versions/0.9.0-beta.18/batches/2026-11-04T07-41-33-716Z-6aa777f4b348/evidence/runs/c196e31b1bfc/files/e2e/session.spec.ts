import { expect, test } from "@playwright/test";
import { BOARD_SIZES, loadBoard, loadSnapshot, positionsForFaces, snapshot } from "./support.ts";

test("supported sizes, valid loads, and saves persist without touching unrelated keys", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await page.evaluate(() => localStorage.setItem("other.application.key", "preserve"));
  await page.getByLabel("Grid size").selectOption("6");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await loadBoard(page, "np1-8-1");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("8");
  expect(await page.evaluate(() => localStorage.getItem("other.application.key"))).toBe("preserve");
  expect(await page.evaluate(() => localStorage.getItem("neon-pairs.preferences.v1"))).toBe('{"size":8}');
  await loadBoard(page, "invalid");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("8");
});

test("malformed saved preferences are ignored", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("neon-pairs.preferences.v1", '{"size":5}'));
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await expect(page.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
});

test("unavailable local storage leaves play available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new Error("storage blocked"); } });
  });
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await expect(page.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
});

test("completed snapshot stays static without writing its moves to the best", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("neon-pairs.best.v1", '{"4":999999}'));
  await page.goto("/");
  await loadSnapshot(page, snapshot("np1-4-1", []));
  await expect(page.getByText("Best: 999999")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.locator(".win-banner")).toHaveClass(/win-banner-static/);
  expect(await page.evaluate(() => localStorage.getItem("neon-pairs.best.v1"))).toBe('{"4":999999}');
});

test("better results replace best scores while equal and worse results preserve them", async ({ page }) => {
  const code = "np1-4-1";
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.goto("/");
  const finishOpenPairs = async (moves: number): Promise<void> => {
    const state = { ...snapshot(code, [0, 1]), moves };
    await loadSnapshot(page, state);
    await page.getByRole("button", { name: "Resume" }).click();
    for (const index of positionsForFaces(code, [0, 1])) await page.locator(".memory-card").nth(index).click();
  };
  await finishOpenPairs(9);
  await expect(page.getByText("Best: 11")).toBeVisible();
  await finishOpenPairs(6);
  await expect(page.getByText("Best: 8")).toBeVisible();
  await finishOpenPairs(6);
  await expect(page.getByText("Best: 8")).toBeVisible();
  await finishOpenPairs(7);
  await expect(page.getByText("Best: 8")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Best: 8")).toBeVisible();
});

test("winning an imported unfinished game records its best for each supported board size", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.goto("/");
  for (const size of BOARD_SIZES) {
    const code = `np1-${size}-1`;
    await loadSnapshot(page, snapshot(code, [0]));
    await expect(page.getByLabel("Grid size")).toHaveValue(String(size));
    await page.getByRole("button", { name: "Resume" }).click();
    const pair = positionsForFaces(code, [0]);
    for (const index of pair) await page.locator(".memory-card").nth(index).click();
    const pairs = size * size / 2;
    await expect(page.getByText(`Pairs: ${pairs}/${pairs}`)).toBeVisible();
    await expect(page.getByText(`Best: ${pairs}`)).toBeVisible();
  }
});

test("buttons retain focus when they replace a game; a completed touch tap activates a card", async ({ page, browser }) => {
  await page.goto("/");
  const fresh = page.getByRole("button", { name: "New Game" });
  await fresh.click();
  await expect(fresh).toBeFocused();
  const repeat = page.getByRole("button", { name: "Restart" });
  await repeat.click();
  await expect(repeat).toBeFocused();
  await page.getByText("Reproduce a game", { exact: true }).click();
  const exportButton = page.getByRole("button", { name: "Export snapshot" });
  await exportButton.click();
  await expect(exportButton).toBeFocused();
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(snapshot("np1-6-1", [0])));
  const importButton = page.getByRole("button", { name: "Load snapshot" });
  await importButton.click();
  await expect(importButton).toBeFocused();

  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  try {
    const touchPage = await context.newPage();
    await touchPage.goto("http://127.0.0.1:4173");
    const card = touchPage.getByRole("button", { name: "Row 1, column 1, closed" });
    const box = await card.boundingBox();
    if (box === null) throw new Error("The first card must be visible for touch input.");
    await touchPage.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(touchPage.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
  } finally {
    await context.close();
  }
});
