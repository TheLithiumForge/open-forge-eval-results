import { expect, test } from "@playwright/test";
import { cardButtons, deckFor, loadBoard, pairsFor } from "./support.ts";

test("reveals a pair by touch on a phone sized viewport", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const code = await page.getByLabel("Board code").inputValue();
    const pair = pairsFor(deckFor(code))[0];
    if (!pair) throw new Error("Expected a pair in the phone deal");
    await cardButtons(page).nth(pair[0]).tap();
    await expect(cardButtons(page).nth(pair[0])).toHaveAttribute("aria-label", /revealed$/);
    await cardButtons(page).nth(pair[1]).tap();
    await expect(page.getByText("Moves: 1")).toBeVisible();
    await expect(page.getByText("Pairs: 1/8")).toBeVisible();
    await loadBoard(page, "np1-16-1");
    const scrollArea = page.locator(".board-scroll");
    const scrollBounds = await scrollArea.boundingBox();
    expect(scrollBounds).not.toBeNull();
    if (scrollBounds) {
      const touch = await context.newCDPSession(page);
      const startX = scrollBounds.x + scrollBounds.width - 12;
      const startY = scrollBounds.y + 180;
      const endX = scrollBounds.x + 40;
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y: startY }],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: endX, y: startY }],
      });
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => scrollArea.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await touch.detach();
    }
    await expect(page.getByText("Moves: 0")).toBeVisible();
    await cardButtons(page).nth(0).tap();
    await expect(cardButtons(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
    await cardButtons(page).nth(255).tap();
    await expect(cardButtons(page).nth(255)).toHaveAttribute("aria-label", /revealed$/);
  } finally {
    await context.close();
  }
});

