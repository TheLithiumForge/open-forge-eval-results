import { expect, test } from "@playwright/test";

test("16 by 16 scrolls inside the board at a 360 by 800 viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByLabel("Grid size").selectOption("16");
  const board = page.getByRole("grid", { name: "Game board" });
  const cards = page.getByRole("button", { name: /Row \d+, column \d+, closed/ });
  await expect(cards).toHaveCount(256);
  expect(await page.locator("body").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(360);
  expect(await board.evaluate((element) => element.scrollWidth)).toBeGreaterThan(await board.evaluate((element) => element.clientWidth));
  const first = page.getByRole("button", { name: "Row 1, column 1, closed" });
  const last = page.getByRole("button", { name: "Row 16, column 16, closed" });
  expect(await first.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  await first.focus();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowDown");
  for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowRight");
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport();
});

test("4 by 4 and 16 by 16 remain usable in a 200 percent zoom-equivalent layout", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173");
    expect(await page.evaluate<number>("window.devicePixelRatio")).toBe(2);
    await expect(page.getByLabel("Grid size")).toHaveValue("4");
    const firstFour = page.getByRole("button", { name: "Row 1, column 1, closed" });
    await firstFour.click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Moves: 1")).toBeVisible();

    await page.getByLabel("Grid size").selectOption("16");
    const board = page.getByRole("grid", { name: "Game board" });
    await expect(page.getByRole("button", { name: /Row \d+, column \d+, closed/ })).toHaveCount(256);
    const firstSixteen = page.getByRole("button", { name: "Row 1, column 1, closed" });
    const lastSixteen = page.getByRole("button", { name: "Row 16, column 16, closed" });
    expect(await firstSixteen.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
    await firstSixteen.click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    for (let step = 0; step < 14; step += 1) await page.keyboard.press("ArrowRight");
    for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowDown");
    await expect(lastSixteen).toBeFocused();
    await expect(page.getByText("Moves: 1")).toBeVisible();
    expect(await board.evaluate((element) => element.scrollWidth)).toBeGreaterThan(await board.evaluate((element) => element.clientWidth));
    await expect(lastSixteen).toBeInViewport();
    expect(await page.locator("body").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(640);

    await page.getByText("Reproduce a game").click();
    const completed = {
      version: 1, boardCode: "np1-4-1", matched: Array.from({ length: 16 }, (_, index) => index),
      selection: { kind: "closed" }, moves: 8, elapsedMs: 1200, started: true,
    };
    await page.getByLabel("Snapshot JSON").fill(JSON.stringify(completed));
    await page.getByRole("button", { name: "Load snapshot" }).click();
    const status = await page.locator(".game-status").boundingBox();
    const banner = await page.locator(".win-banner").boundingBox();
    expect(status && banner).toBeTruthy();
    expect(status!.y + status!.height).toBeLessThanOrEqual(banner!.y);
    expect(banner!.x + banner!.width).toBeLessThanOrEqual(640);
    await expect(page.locator(".win-banner")).toContainText("8 moves");
  } finally {
    await context.close();
  }
});
