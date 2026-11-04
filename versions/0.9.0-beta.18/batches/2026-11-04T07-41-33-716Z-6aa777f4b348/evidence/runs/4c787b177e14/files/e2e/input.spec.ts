import { expect, test } from "@playwright/test";
import { cardAt, startBoard } from "./helpers.ts";

test("uses Enter and Space to activate cards while arrows only move focus", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await cardAt(page, 0).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  await expect(cardAt(page, 0)).toBeFocused();
  expect(await page.getByText("Moves: 0", { exact: true }).count()).toBe(1);
  await page.keyboard.press("Control+ArrowRight");
  await expect(cardAt(page, 0)).toBeFocused();
  await page.keyboard.press("Shift+Space");
  expect(await cardAt(page, 0).getAttribute("aria-label")).toBe("Row 1, column 1, closed");
  await page.keyboard.press("Enter");
  expect(await cardAt(page, 0).getAttribute("aria-label")).toContain("revealed");
  await cardAt(page, 11).focus();
  await page.keyboard.press("Space");
  await expect(cardAt(page, 0)).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();

  await cardAt(page, 1).hover();
  expect(await page.getByText("Moves: 1", { exact: true }).count()).toBe(1);
  await cardAt(page, 1).dispatchEvent("pointerdown", { button: 0, pointerId: 1, pointerType: "touch", isPrimary: true });
  await cardAt(page, 1).dispatchEvent("pointercancel", { button: 0, pointerId: 1, pointerType: "touch", isPrimary: true });
  expect(await page.locator(".card-revealed").count()).toBe(0);

  const contextMenu = page.evaluate(() => new Promise<boolean>((resolve) => {
    document.addEventListener("contextmenu", (event) => resolve(event.defaultPrevented), { once: true });
  }));
  await cardAt(page, 1).click({ button: "right" });
  expect(await contextMenu).toBe(false);
  expect(await page.getByText("Moves: 1", { exact: true }).count()).toBe(1);
});

test("a completed tap activates a card in a touch browser context", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await startBoard(page);
    await cardAt(page, 0).scrollIntoViewIfNeeded();
    const bounds = await cardAt(page, 0).boundingBox();
    if (bounds === null) throw new Error("The first card is visible.");
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed/);
    await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
