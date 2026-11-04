import { expect, test } from "@playwright/test";
import { cards, CODE_4, loadBoard } from "./helpers.ts";

test("native buttons, pointer feedback and keyboard activation share one action", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await loadBoard(page, CODE_4);
  const first = cards(page).nth(0);
  await first.hover();
  await first.click({ button: "right" });
  await page.keyboard.press("Escape");
  await expect(first).toHaveAttribute("aria-label", "Row 1, column 1, closed");
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();

  const second = cards(page).nth(1);
  await second.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch", button: 0 });
  await second.focus();
  await page.keyboard.press(" ");
  await expect(second).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
});

test("arrow keys move a single remembered tab stop without playing or crossing edges", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await loadBoard(page, CODE_4);
  const first = cards(page).nth(0);
  await first.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(first).toBeFocused();
  await page.keyboard.press("Control+Enter");
  await expect(first).toHaveAttribute("aria-label", "Row 1, column 1, closed");
  await page.keyboard.press("ArrowRight");
  await expect(cards(page).nth(1)).toBeFocused();
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(cards(page).nth(1)).toHaveAttribute("aria-label", /revealed$/);
  expect(await cards(page).evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length)).toBe(1);
  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
});

test("restarting resets the roving tab stop and matched buttons remain focusable", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await loadBoard(page, CODE_4);
  await cards(page).nth(4).focus();
  await page.getByRole("button", { name: "Restart" }).click();
  expect(await cards(page).evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length)).toBe(1);
  expect(await cards(page).nth(0).getAttribute("tabindex")).toBe("0");
  await cards(page).nth(2).click();
  await cards(page).nth(6).click();
  const matched = cards(page).nth(6);
  await expect(matched).toHaveAttribute("aria-disabled", "true");
  await expect(matched).toHaveAttribute("tabindex", "0");
  await matched.focus();
  await matched.press("Enter");
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
});

test("a real touch tap reveals one card on a phone sized board", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await cards(page).nth(0).tap();
    await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  } finally {
    await context.close();
  }
});

test("identical turns each produce one announcement while focus and the clock add none", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("http://127.0.0.1:4173/");
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await loadBoard(page, CODE_4);
  const state = await page.getByRole("status").evaluateHandle((region) => {
    const observed: { messages: string[] } = { messages: [] };
    new MutationObserver(() => observed.messages.push(region.textContent ?? ""))
      .observe(region, { childList: true, subtree: true });
    return observed;
  });
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  await expect.poll(() => state.evaluate((value) => value.messages.length)).toBe(1);
  await page.keyboard.press("ArrowRight");
  await page.clock.runFor(800);
  await expect.poll(() => state.evaluate((value) => value.messages.length)).toBe(1);
  await cards(page).nth(2).click();
  await cards(page).nth(8).click();
  await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  await expect.poll(() => state.evaluate((value) => value.messages.length)).toBe(2);
  await expect.poll(() => state.evaluate((value) => value.messages))
    .toEqual(["No match. Cards close after a short pause.", "No match. Cards close after a short pause."]);
});
