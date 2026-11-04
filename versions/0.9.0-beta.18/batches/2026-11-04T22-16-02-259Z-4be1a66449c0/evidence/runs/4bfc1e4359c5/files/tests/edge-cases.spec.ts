import { expect, test } from "@playwright/test";
import { loadKnownBoard } from "./helpers.ts";

test("rejects bad reproduction drafts without replacing the current game", async ({ page }) => {
  await page.goto("/");
  await loadKnownBoard(page);
  await page.getByLabel("Board code").fill("np1-4-01");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.getByRole("status")).toHaveText("Invalid board code.");
  await expect(page.getByLabel("Board code")).toHaveValue("np1-4-01");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();

  await page.getByLabel("Snapshot JSON").fill('{"version":1}');
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("status")).toHaveText("Invalid snapshot.");
  await expect(page.getByLabel("Snapshot JSON")).toHaveValue('{"version":1}');
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
});

test("a hidden page pauses both the mismatch and active clock", async ({ page }) => {
  await page.goto("/");
  await loadKnownBoard(page);
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(900);
  await expect(page.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
  await page.getByRole("button", { name: "Export snapshot" }).click();
  const pausedSnapshot = JSON.parse(await page.getByLabel("Snapshot JSON").inputValue()) as {
    elapsedMs: number; selection: { remainingMs: number };
  };
  expect(pausedSnapshot.elapsedMs).toBeLessThan(250);
  expect(pausedSnapshot.selection.remainingMs).toBeGreaterThan(650);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(500);
  await expect(page.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
});

test("completed snapshot stays static and never replaces a saved best", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("neon-pairs.best.v1", JSON.stringify({ 4: 9 })));
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  const snapshot = {
    version: 1,
    boardCode: "np1-4-1",
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: "closed" },
    moves: 8,
    elapsedMs: 1000,
    started: true,
  };
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(snapshot));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("status")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByLabel("Game complete")).toContainText("8 moves");
  await expect(page.getByText("Best:").locator("..")).toContainText("9");
  expect(await page.locator(".winBanner").getAttribute("class")).not.toContain("celebrate");
  expect(await page.evaluate(() => localStorage.getItem("neon-pairs.best.v1"))).toBe('{"4":9}');
});

test("200 percent zoom dimensions keep controls and a large board usable", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  const first = page.getByRole("button", { name: "Row 1, column 3, closed" });
  await first.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(page.getByText("Pairs:").locator("..")).toContainText("1/8");

  await page.getByLabel("Grid size").selectOption("16");
  const complete = {
    version: 1,
    boardCode: "np1-16-1",
    matched: Array.from({ length: 256 }, (_, index) => index),
    selection: { kind: "closed" },
    moves: 128,
    elapsedMs: 1000,
    started: true,
  };
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(complete));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".memoryCard")).toHaveCount(256);
  await expect(page.locator(".winBanner")).toContainText("128 moves");
  await expect(page.locator(".reproductionStatus")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator(".memoryCard").first().evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  expect(await page.locator(".boardScroll").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const layout = await page.evaluate(() => [".stats", ".dealControls", ".winBanner", ".boardScroll", ".reproductionPanel"]
    .map((selector) => {
      const rectangle = document.querySelector(selector)!.getBoundingClientRect();
      return { top: rectangle.top, bottom: rectangle.bottom };
    }));
  expect(layout.every((rectangle, index) => index === 0 || rectangle.top >= layout[index - 1]!.bottom)).toBe(true);
  await context.close();
});
