import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOARD_SIZES, loadSnapshot, positionsForFaces, snapshot } from "./support.ts";

for (const width of [360, 1280]) {
  test(`16x16 board fits within the ${width}px page and scrolls inside its panel`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await loadSnapshot(page, snapshot("np1-16-1", []));
    const cards = page.locator(".memory-card");
    const area = page.locator(".board-scroll");
    await expect(cards).toHaveCount(256);
    const dimensions = await cards.first().evaluate((card) => {
      const bounds = card.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    });
    expect(dimensions.width).toBeGreaterThanOrEqual(44);
    expect(dimensions.height).toBeGreaterThanOrEqual(44);
    expect(dimensions.width).toBe(dimensions.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const scroll = await area.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    if (width === 360) expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);

    await checkFocusedOutline(page, 0, "ArrowLeft", 0);
    await checkFocusedOutline(page, 136, "ArrowRight", 137);
    await checkFocusedOutline(page, 255, "ArrowRight", 255);
  });
}

test("touch scrolling reaches the far side of a narrow 16x16 board", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await loadSnapshot(page, snapshot("np1-16-1", []));
  const area = page.locator(".board-scroll");
  const bounds = await area.boundingBox();
  if (bounds === null) throw new Error("The board scroll area must be visible.");
  const top = Math.max(0, bounds.y);
  const left = Math.max(0, bounds.x);
  const visibleHeight = Math.min(800, bounds.y + bounds.height) - top;
  const visibleWidth = Math.min(360, bounds.x + bounds.width) - left;
  if (visibleHeight < 80 || visibleWidth < 80) throw new Error("The board must have a touch-visible scroll area.");
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const y = top + visibleHeight / 2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: left + visibleWidth * 0.75, y, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: left + visibleWidth * 0.25, y, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => area.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const x = left + visibleWidth / 2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: top + visibleHeight * 0.75, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: top + visibleHeight * 0.25, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => area.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("640x400 at device scale 2 stays playable on four and sixteen columns", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173");
    for (const size of [BOARD_SIZES[0], BOARD_SIZES[6]]) {
      const code = `np1-${size}-1`;
      await loadSnapshot(page, snapshot(code, [0]));
      await expect(page.getByLabel("Grid size")).toHaveValue(String(size));
      await expect(page.locator(".visible-status")).toHaveText("Loaded snapshot. Select Resume to continue.");
      await page.getByRole("button", { name: "Resume" }).click();
      const pair = positionsForFaces(code, [0]);
      const first = pair[0];
      const second = pair[1];
      if (first === undefined || second === undefined) throw new Error("The pending pair must have two cards.");
      await page.locator(".memory-card").nth(first).click();
      await page.locator(".memory-card").nth(second).press("Enter");
      const total = size * size / 2;
      await expect(page.getByText(`Pairs: ${total}/${total}`)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Every pair found!" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
    }
  } finally {
    await context.close();
  }
});

test("the offline distribution opens with external requests blocked", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await expect(page.getByText("Moves: 0")).toBeVisible();
  expect(requests).toEqual([]);
});

test("all 128 matched faces form a 44px grayscale review sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 2400 });
  await page.goto("/");
  await loadSnapshot(page, snapshot("np1-16-1", []));
  await page.addStyleTag({ content: `
    .board-scroll { max-height: none !important; overflow: visible !important; padding: 0 !important; border: 0 !important; width: max-content !important; }
    .board-grid { --card-size: 44px !important; }
    .face-sheet-proof { display: grid; grid-template-columns: repeat(8, 44px); gap: 6px; width: max-content; filter: grayscale(1); }
    .face-sheet-card { position: relative; display: grid; width: 44px; height: 44px; place-items: center; padding: 0; border: 2px solid #8BEA7D; border-radius: 8px; background: #111625; }
    .face-sheet-card .face-art { display: block; width: 100%; height: 100%; }
  ` });
  const identities = await page.evaluate(() => {
    const unique = new Map<string, HTMLButtonElement>();
    for (const card of document.querySelectorAll<HTMLButtonElement>(".memory-card")) {
      const label = card.getAttribute("aria-label");
      if (label === null) continue;
      const parts = label.split(", ");
      if (parts.length < 4 || parts[parts.length - 1] !== "matched") continue;
      const faceName = parts.slice(2, parts.length - 1).join(", ");
      if (!unique.has(faceName)) unique.set(faceName, card);
    }
    const faceSheet = document.createElement("div");
    faceSheet.className = "face-sheet-proof";
    faceSheet.dataset.review = "faces";
    const matchedSheet = document.createElement("div");
    matchedSheet.className = "face-sheet-proof";
    matchedSheet.dataset.review = "matched-cards";
    for (const source of unique.values()) {
      const svg = source.querySelector("svg");
      if (svg === null) continue;
      const faceCard = document.createElement("div");
      faceCard.className = "face-sheet-card";
      faceCard.append(svg.cloneNode(true));
      faceSheet.append(faceCard);
      const matchedCard = document.createElement("div");
      matchedCard.className = "face-sheet-card";
      matchedCard.append(svg.cloneNode(true));
      const check = source.querySelector(".match-check");
      if (check !== null) matchedCard.append(check.cloneNode(true));
      matchedSheet.append(matchedCard);
    }
    document.body.append(faceSheet, matchedSheet);
    return { count: unique.size, faceCards: faceSheet.childElementCount, matchedCards: matchedSheet.childElementCount };
  });
  expect(identities).toEqual({ count: 128, faceCards: 128, matchedCards: 128 });
  await mkdir("artifacts", { recursive: true });
  await page.locator('[data-review="faces"]').screenshot({ path: "artifacts/face-sheet-grayscale.png" });
  await page.locator('[data-review="matched-cards"]').screenshot({ path: "artifacts/matched-face-sheet-grayscale.png" });
});

async function checkFocusedOutline(page: Page, from: number, key: string, expected: number): Promise<void> {
  const cards = page.locator(".memory-card");
  await cards.nth(from).focus();
  await page.keyboard.press(key);
  const card = cards.nth(expected);
  await expect(card).toBeFocused();
  const bounds = await card.evaluate((element) => {
    const area = element.closest(".board-scroll");
    const cardBox = element.getBoundingClientRect();
    const areaBox = area?.getBoundingClientRect();
    return {
      left: cardBox.left,
      right: cardBox.right,
      top: cardBox.top,
      bottom: cardBox.bottom,
      areaLeft: areaBox?.left ?? 0,
      areaRight: areaBox?.right ?? 0,
      areaTop: areaBox?.top ?? 0,
      areaBottom: areaBox?.bottom ?? 0,
      outline: getComputedStyle(element).outlineWidth,
    };
  });
  expect(bounds.outline).toBe("3px");
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.areaLeft + 5);
  expect(bounds.right).toBeLessThanOrEqual(bounds.areaRight - 5);
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.areaTop + 5);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.areaBottom - 5);
}
