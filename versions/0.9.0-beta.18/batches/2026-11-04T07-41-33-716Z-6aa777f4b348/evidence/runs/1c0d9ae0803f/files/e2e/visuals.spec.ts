import { expect, test } from "@playwright/test";
import type { CDPSession, Page } from "@playwright/test";
import { cards, clickPairs, CODE_4, loadBoard, openReproduction } from "./helpers.ts";

const SIXTEEN = "np1-16-1";
const PAUSED_SIXTEEN = JSON.stringify({ version: 1, boardCode: SIXTEEN, matched: [],
  selection: { kind: "one", index: 0 }, moves: 0, elapsedMs: 0, started: true });

async function touchSwipe(cdp: CDPSession, x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x, y }] });
  for (let step = 1; step <= 20; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
      touchPoints: [{ id: 1, x: x + deltaX * step / 20, y: y + deltaY * step / 20 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function loadLargeBoard(page: import("@playwright/test").Page): Promise<void> {
  await loadBoard(page, SIXTEEN);
  await expect(cards(page)).toHaveCount(256);
}

async function assertFocusGeometry(page: import("@playwright/test").Page, index: number): Promise<void> {
  const geometry = await cards(page).nth(index).evaluate((card) => {
    const scroller = card.closest<HTMLElement>(".neon-board-scroll");
    if (!scroller) throw new Error("Focused card needs its board scroll area");
    const cardBox = card.getBoundingClientRect();
    const scrollBox = scroller.getBoundingClientRect();
    return { left: cardBox.left - 5, right: cardBox.right + 5, top: cardBox.top - 5, bottom: cardBox.bottom + 5,
      scrollLeft: scrollBox.left, scrollRight: scrollBox.right, scrollTop: scrollBox.top, scrollBottom: scrollBox.bottom,
      width: window.innerWidth, height: window.innerHeight };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.scrollLeft);
  expect(geometry.right).toBeLessThanOrEqual(geometry.scrollRight);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.scrollTop);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.scrollBottom);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
}

test("large grid stays scrollable at phone and desktop sizes with visible focus outlines", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("http://127.0.0.1:4173/");
  await loadLargeBoard(page);
  await expect(cards(page).nth(0)).toHaveCSS("width", "44px");
  await expect(cards(page).nth(0)).toHaveCSS("height", "44px");
  const phoneWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(phoneWidth).toBeLessThanOrEqual(360);
  await cards(page).nth(0).focus();
  await assertFocusGeometry(page, 0);
  for (let step = 0; step < 8; step += 1) await page.keyboard.press("ArrowDown");
  for (let step = 0; step < 8; step += 1) await page.keyboard.press("ArrowRight");
  await expect(cards(page).nth(136)).toBeFocused();
  const nearestHorizontalOffset = await page.locator(".neon-board-scroll").evaluate((element) => element.scrollLeft);
  expect(nearestHorizontalOffset).toBeGreaterThanOrEqual(120);
  expect(nearestHorizontalOffset).toBeLessThan(180);
  await assertFocusGeometry(page, 136);
  await page.keyboard.press("Tab");
  await expect(page.locator(".neon-reproduction summary")).toBeFocused();
  await page.locator(".neon-board-scroll").evaluate((element) => element.scrollTo({ left: 0, top: 0 }));
  await page.keyboard.press("Shift+Tab");
  await expect(cards(page).nth(136)).toBeFocused();
  const tabReturnOffset = await page.locator(".neon-board-scroll").evaluate((element) => element.scrollLeft);
  expect(tabReturnOffset).toBeGreaterThanOrEqual(120);
  expect(tabReturnOffset).toBeLessThan(180);
  await assertFocusGeometry(page, 136);
  await cards(page).nth(0).focus();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowRight");
  for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowDown");
  await expect(cards(page).nth(255)).toBeFocused();
  await assertFocusGeometry(page, 255);
  await cards(page).nth(136).focus();
  await assertFocusGeometry(page, 136);
  await cards(page).nth(255).focus();
  await assertFocusGeometry(page, 255);
  await page.locator(".neon-board-scroll").screenshot({ path: "artifacts/large-board-360.png" });

  await page.setViewportSize({ width: 1280, height: 800 });
  await cards(page).nth(0).focus();
  await cards(page).nth(255).focus();
  await assertFocusGeometry(page, 255);
  await expect(page.locator(".neon-board-scroll")).toHaveCSS("max-height", "560px");
  await expect(cards(page).nth(0)).toHaveCSS("border-width", "2px");
  await expect(cards(page).nth(0)).toHaveCSS("border-radius", "8px");
  await expect(cards(page).nth(0)).toHaveCSS("scroll-margin", "6px");
});

test("the win banner pulses once for 600ms; reduced motion removes effects", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("http://127.0.0.1:4173/");
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  await loadBoard(page, CODE_4);
  await clickPairs(page);
  const banner = page.locator(".neon-win-banner");
  await expect(banner).toHaveClass(/--pulse/);
  await expect(banner).toHaveCSS("animation-name", "neon-win-pulse");
  await expect(banner).toHaveCSS("animation-iteration-count", "1");
  await expect(banner).toHaveCSS("animation-duration", "0.6s");
  await page.clock.runFor(599);
  await expect(banner).toHaveClass(/--pulse/);
  await page.clock.runFor(1);
  await expect(banner).not.toHaveClass(/--pulse/);
  await expect(banner).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cards(page).nth(0)).toHaveCSS("transition-duration", "0s");
});

test("touch scroll reaches the final card and touch activation reveals it", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await loadLargeBoard(page);
    const scroller = page.locator(".neon-board-scroll");
    await scroller.scrollIntoViewIfNeeded();
    const scrollBox = await scroller.boundingBox();
    if (!scrollBox) throw new Error("Large board scroll area must render");
    const cdp = await context.newCDPSession(page);
    await touchSwipe(cdp, scrollBox.x + scrollBox.width / 2, scrollBox.y + scrollBox.height - 25, 0, -450);
    await touchSwipe(cdp, scrollBox.x + scrollBox.width - 25, scrollBox.y + scrollBox.height / 2, -600, 0);
    const scrollPosition = await scroller.evaluate((element) => ({ top: element.scrollTop, left: element.scrollLeft,
      height: element.scrollHeight, width: element.scrollWidth, clientHeight: element.clientHeight,
      clientWidth: element.clientWidth }));
    expect(scrollPosition.top, JSON.stringify({ scrollPosition, scrollBox,
      viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollY })) })).toBeGreaterThan(0);
    expect(scrollPosition.left).toBeGreaterThan(0);
    expect(scrollPosition.top + scrollPosition.clientHeight).toBeGreaterThan(scrollPosition.height * 0.9);
    expect(scrollPosition.left + scrollPosition.clientWidth).toBeGreaterThan(scrollPosition.width * 0.9);
    const lastCard = await cards(page).nth(255).boundingBox();
    const scrollFrame = await scroller.boundingBox();
    if (!lastCard || !scrollFrame) throw new Error("Scrolled board needs a final visible card");
    expect(lastCard.x + lastCard.width + 5).toBeLessThanOrEqual(scrollFrame.x + scrollFrame.width);
    expect(lastCard.y + lastCard.height + 5).toBeLessThanOrEqual(scrollFrame.y + scrollFrame.height);
    await cards(page).nth(255).tap();
    await expect(cards(page).nth(255)).toHaveAttribute("aria-label", /revealed$/);
    await assertFocusGeometry(page, 255);
  } finally {
    await context.close();
  }
});

test("zoom layout keeps Resume focus and controls visible without page overflow", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.goto("http://127.0.0.1:4173/");
    await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
    await page.setViewportSize({ width: 640, height: 400 });
    await expect(page.getByRole("combobox", { name: "Grid size" })).toBeVisible();
    await loadBoard(page, CODE_4);
    await clickPairs(page);
    await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
    const visibleLayout = await page.locator(".neon-game-status p, .neon-win-banner, .neon-board-scroll")
      .evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }));
    for (let first = 0; first < visibleLayout.length; first += 1) {
      for (let second = first + 1; second < visibleLayout.length; second += 1) {
        const a = visibleLayout[first];
        const b = visibleLayout[second];
        if (a && b) expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
      }
    }
    await openReproduction(page);
    const textarea = page.getByLabel("Snapshot JSON");
    await textarea.fill(PAUSED_SIXTEEN);
    await page.getByRole("button", { name: "Load snapshot" }).click();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(cards(page).nth(0)).toBeFocused();
    await assertFocusGeometry(page, 0);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(640);
    await expect(page.getByText("Time: 0:00", { exact: true })).toBeVisible();
    await page.locator(".neon-board-scroll").screenshot({ path: "artifacts/large-board-zoom.png" });
  } finally {
    await context.close();
  }
});
