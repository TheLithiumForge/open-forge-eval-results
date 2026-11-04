import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { activateCards, boardCards, captureScreenshot, loadBoardCode, loadSnapshot, openGame, saveEvidence } from "./support.ts";
import { referenceDeck, referencePairs } from "./reference-deck.ts";

declare global {
  interface Window {
    __npAnimationStarts: number;
    __npAnimationEnds: number;
  }
}

async function minimumCardWidth(page: Page): Promise<number> {
  return page.locator(".card").evaluateAll((cards) => Math.min(...cards.map((card) => card.getBoundingClientRect().width)));
}

async function fullFocusRingVisible(page: Page, index: number): Promise<boolean> {
  return boardCards(page).nth(index).evaluate((card) => {
    const board = card.closest(".board-scroll");
    if (!(board instanceof HTMLElement)) return false;
    const cardBox = card.getBoundingClientRect();
    const boardBox = board.getBoundingClientRect();
    const left = boardBox.left + board.clientLeft;
    const top = boardBox.top + board.clientTop;
    const right = left + board.clientWidth;
    const bottom = top + board.clientHeight;
    return cardBox.left - 5 >= left && cardBox.top - 5 >= top
      && cardBox.right + 5 <= right && cardBox.bottom + 5 <= bottom;
  });
}

test("captures desktop, phone, and zoom layouts with reachable 16x16 cards", async ({ browser, page }) => {
  await openGame(page);
  await captureScreenshot(page, "evidence/layout/desktop-1280x800.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await captureScreenshot(page, "evidence/layout/mobile-360x800.png");
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadBoardCode(page, "np1-16-1");
  await expect(boardCards(page)).toHaveCount(256);
  await expect.poll(() => minimumCardWidth(page)).toBeGreaterThanOrEqual(44);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => page.locator(".board-scroll").evaluate((element) => element.clientHeight)).toBeLessThanOrEqual(560);
  await expect(page.locator(".board-scroll")).toHaveCSS("padding", "6px");
  await page.setViewportSize({ width: 360, height: 800 });
  await expect.poll(() => minimumCardWidth(page)).toBe(44);

  for (const index of [0, 128, 255]) {
    await boardCards(page).nth(index).focus();
    expect(await fullFocusRingVisible(page, index)).toBe(true);
  }
  await boardCards(page).nth(0).focus();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowRight");
  for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowDown");
  await expect(boardCards(page).nth(255)).toBeFocused();
  expect(await fullFocusRingVisible(page, 255)).toBe(true);
  await page.getByRole("button", { name: "New Game" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();

  const zoom = await browser.newContext({ baseURL: "http://127.0.0.1:4173", viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  try {
    const zoomPage = await zoom.newPage();
    await openGame(zoomPage);
    await loadBoardCode(zoomPage, "np1-4-1");
    const pairs = referencePairs(referenceDeck("np1-4-1"));
    await boardCards(zoomPage).nth(0).click();
    await boardCards(zoomPage).nth(11).focus();
    await zoomPage.keyboard.press("Space");
    const remainingPairs = pairs.filter(([first, second]) => first !== 0 || second !== 11);
    await activateCards(zoomPage, remainingPairs.flatMap(([first, second]) => [first, second]));
    await expect(zoomPage.locator(".win-banner")).toContainText("All pairs found in 8 moves");
    const statusBox = await zoomPage.locator(".game-status").boundingBox();
    const winBox = await zoomPage.locator(".win-banner").boundingBox();
    expect(statusBox).not.toBeNull();
    expect(winBox).not.toBeNull();
    if (statusBox !== null && winBox !== null) expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(winBox.y);
    await captureScreenshot(zoomPage, "evidence/layout/zoom-640x400-dsf2.png");
    await loadBoardCode(zoomPage, "np1-16-1");
    await expect(zoomPage.locator(".game-status")).toBeVisible();
    await expect.poll(() => minimumCardWidth(zoomPage)).toBeGreaterThanOrEqual(44);
    await expect.poll(() => zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await zoomPage.locator(".game-controls").scrollIntoViewIfNeeded();
    await expect(zoomPage.getByLabel("Grid size")).toBeVisible();
    await boardCards(zoomPage).nth(0).click();
    await zoomPage.keyboard.press("ArrowRight");
    await zoomPage.keyboard.press("Enter");
    await expect(zoomPage.locator(".game-status")).toContainText("Moves: 1");
    await boardCards(zoomPage).nth(255).focus();
    expect(await fullFocusRingVisible(zoomPage, 255)).toBe(true);
    await expect.poll(() => zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await zoom.close();
  }
});

test("builds a grayscale 128-face sheet from 44px matched application cards", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openGame(page);
  const matched = Array.from({ length: 256 }, (_, index) => index);
  await loadSnapshot(page, {
    version: 1, boardCode: "np1-16-1", matched, selection: { kind: "closed" },
    moves: 128, elapsedMs: 0, started: true,
  });
  await expect(boardCards(page)).toHaveCount(256);
  await expect(page.locator(".face-artwork")).toHaveCount(256);
  await expect.poll(() => minimumCardWidth(page)).toBe(44);
  const artworkWidth = await boardCards(page).nth(0).locator(".face-artwork").evaluate((svg) => svg.getBoundingClientRect().width);
  expect(artworkWidth).toBe(32);
  const deck = referenceDeck("np1-16-1");
  const firstByFace = new Map<number, number>();
  deck.forEach((face, index) => { if (!firstByFace.has(face)) firstByFace.set(face, index); });
  const allCards = await boardCards(page).evaluateAll((cards) => cards.map((card) => card.outerHTML));
  const uniqueCards = Array.from({ length: 128 }, (_, face) => {
    const index = firstByFace.get(face);
    const markup = index === undefined ? undefined : allCards[index];
    if (markup === undefined) throw new Error(`Face ${face} was not rendered.`);
    return markup;
  });
  const uniqueArtwork = new Set(uniqueCards.map((markup) => {
    const opening = markup.indexOf("<svg aria-hidden=\"true\"");
    const closing = markup.indexOf("</svg>", opening);
    return markup.slice(opening, closing + 6);
  }));
  expect(uniqueArtwork.size).toBe(128);

  const styles = await page.evaluate(() => Array.from(document.styleSheets)
    .map((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n"))
    .join("\n"));
  const body = uniqueCards.join("\n");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs grayscale faces at 44px</title><style>${styles}
body{margin:0;padding:16px;font:16px/24px system-ui,sans-serif;color:#F4F6FF;background:#090B14}
.face-sheet{display:grid;grid-template-columns:repeat(16,44px);gap:6px;width:max-content;padding:16px;background:#141827}
.face-sheet .card{width:44px;height:44px;min-width:44px;max-width:44px;aspect-ratio:1;padding:4px;border:2px solid #8BEA7D;box-sizing:border-box;filter:grayscale(1)}
.face-sheet .face-artwork{display:block;width:100%;height:100%}</style><h1>128 faces at 44px</h1><p>Each cell keeps the application card box: 2px border, 4px padding, 32px artwork.</p><main class="face-sheet">${body}</main></html>`;
  await saveEvidence("evidence/artworks/grayscale-facesheet.html", html);
});

test("matched hover stays green and reduced motion removes card and win animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  const pairs = referencePairs(referenceDeck("np1-4-1"));
  await activateCards(page, [0, 11]);
  await boardCards(page).nth(0).hover();
  const border = await boardCards(page).nth(0).evaluate((card) => getComputedStyle(card).borderTopColor);
  const transition = await boardCards(page).nth(0).evaluate((card) => getComputedStyle(card).transitionDuration);
  expect(border).toBe("rgb(139, 234, 125)");
  expect(transition).toBe("0s");
  const remaining = pairs.filter(([first, second]) => first !== 0 || second !== 11);
  await activateCards(page, remaining.flatMap(([first, second]) => [first, second]));
  const animation = await page.locator(".win-banner").evaluate((banner) => getComputedStyle(banner).animationName);
  expect(animation).toBe("none");
});

test("live wins pulse once while a completed import stays static and keeps the saved best", async ({ page }) => {
  await openGame(page);
  await loadBoardCode(page, "np1-4-1");
  await page.evaluate(() => {
    window.__npAnimationStarts = 0;
    window.__npAnimationEnds = 0;
    document.addEventListener("animationstart", (event) => {
      if (event.target instanceof HTMLElement && event.target.classList.contains("win-banner")) window.__npAnimationStarts += 1;
    }, true);
    document.addEventListener("animationend", (event) => {
      if (event.target instanceof HTMLElement && event.target.classList.contains("win-banner")) window.__npAnimationEnds += 1;
    }, true);
  });
  await activateCards(page, [0, 1]);
  await page.waitForTimeout(820);
  await activateCards(page, referencePairs(referenceDeck("np1-4-1")).flatMap(([first, second]) => [first, second]));
  const banner = page.locator(".win-banner");
  await expect(banner).toContainText("All pairs found in 9 moves");
  await expect(banner).toHaveCSS("animation-duration", "0.6s");
  await expect(banner).toHaveCSS("animation-iteration-count", "1");
  await expect.poll(() => page.evaluate(() => window.__npAnimationStarts)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__npAnimationEnds)).toBe(1);

  const completed = {
    version: 1, boardCode: "np1-4-1", matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: "closed" }, moves: 8, elapsedMs: 0, started: true,
  };
  await loadSnapshot(page, completed);
  await expect(page.locator(".control-status")).toHaveText("Loaded completed snapshot.");
  await expect(page.locator(".game-status")).toContainText("Best: 9");
  await expect(banner).not.toHaveClass(/win-banner--pulse/);
  await expect(banner).toHaveCSS("animation-name", "none");
  expect(await page.evaluate(() => window.__npAnimationStarts)).toBe(1);
});
