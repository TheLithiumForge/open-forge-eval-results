import { expect, test } from "@playwright/test";
import { cardAt, loadBoard } from "./helpers/game.ts";

test("scroll a large mobile board and activate its first and last cards by touch", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  await page.getByLabel("Grid size").selectOption("16");
  await loadBoard(page, "np1-16-1");
  await expect(page.locator(".card-button")).toHaveCount(256);
  await cardAt(page, 0).tap();
  await expect(cardAt(page, 0)).toHaveAttribute("aria-label", /revealed$/);

  const session = await context.newCDPSession(page);
  const boardBox = await page.locator(".board-scroll").boundingBox();
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  if (boardBox === null) throw new Error("The scrollable board must be visible.");
  const touchPoint = (x: number, y: number) => ({
    x,
    y,
    id: 0,
    radiusX: 1,
    radiusY: 1,
    force: 1,
  });
  const touchX = Math.min(dimensions.width - 32, boardBox.x + boardBox.width - 24);
  const touchY = Math.min(dimensions.height - 24, boardBox.y + boardBox.height / 2);
  let horizontal = 0;
  for (let swipe = 0; swipe < 3 && horizontal < 470; swipe += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [touchPoint(touchX, touchY)],
    });
    for (let step = 1; step <= 16; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [touchPoint(touchX - step * 16, touchY)],
      });
      await page.waitForTimeout(16);
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    horizontal = await page.locator(".board-scroll").evaluate((element) => element.scrollLeft);
  }
  expect(horizontal).toBeGreaterThan(470);
  const verticalX = boardBox.x + boardBox.width / 2;
  const verticalY = Math.min(dimensions.height - 24, boardBox.y + boardBox.height - 24);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint(verticalX, verticalY)],
  });
  for (let step = 1; step <= 16; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [touchPoint(verticalX, verticalY - step * 16)],
    });
    await page.waitForTimeout(16);
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const vertical = await page.locator(".board-scroll").evaluate((element) => element.scrollTop);
  expect(vertical).toBeGreaterThan(230);

  const viewport = await page.locator(".board-scroll").boundingBox();
  const lastCard = await cardAt(page, 255).boundingBox();
  if (viewport === null || lastCard === null) throw new Error("The final card must be visible.");
  expect(lastCard.x).toBeGreaterThanOrEqual(viewport.x);
  expect(lastCard.x + lastCard.width).toBeLessThanOrEqual(viewport.x + viewport.width);
  expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(viewport.y + viewport.height);

  await cardAt(page, 255).tap();
  await expect(cardAt(page, 255)).toHaveAttribute("aria-label", /, (revealed|matched)$/);
  await session.detach();
  await context.close();
});
