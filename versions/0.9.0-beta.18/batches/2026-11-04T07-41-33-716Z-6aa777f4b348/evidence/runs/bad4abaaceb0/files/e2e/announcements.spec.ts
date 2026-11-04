import { expect, test } from "@playwright/test";
import { cardButtons, deckFor, loadBoard, mismatchFor, REPLAYABLE_CODE } from "./support.ts";

test("announces consecutive misses once each and ignores focus or timer changes", async ({ page }) => {
  const announcements: string[] = [];
  await page.exposeFunction("captureNeonPairsStatus", (text: string) => announcements.push(text));
  await page.goto("/");
  await loadBoard(page, REPLAYABLE_CODE);
  await page.evaluate(() => {
    const status = document.querySelector("[role=status]");
    if (status === null) throw new Error("Polite status region is missing");
    const observer = new MutationObserver((records) => {
      if (!records.some((record) => record.target === status || status.contains(record.target))) return;
      const notify = Reflect.get(window, "captureNeonPairsStatus");
      if (typeof notify === "function") void Reflect.apply(notify, window, [status.textContent ?? ""]);
    });
    observer.observe(status, { subtree: true, childList: true, characterData: true });
  });

  const deck = deckFor(REPLAYABLE_CODE);
  const firstMiss = mismatchFor(deck);
  const secondMiss = mismatchFor(deck, firstMiss);
  const message = "No match. Cards close after a short pause.";
  await cardButtons(page).nth(firstMiss[0]).click();
  await cardButtons(page).nth(firstMiss[1]).click();
  await expect.poll(() => announcements.length).toBe(1);
  await expect(page.getByRole("status")).toHaveText(message);
  await page.waitForTimeout(850);
  await cardButtons(page).nth(4).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  expect(announcements).toEqual([message]);

  await cardButtons(page).nth(secondMiss[0]).click();
  await cardButtons(page).nth(secondMiss[1]).click();
  await expect.poll(() => announcements.length).toBe(2);
  await expect(page.getByRole("status")).toHaveText(message);
  await page.waitForTimeout(850);
  expect(announcements).toEqual([message, message]);
  await expect(page.locator("[role=status][aria-live=polite][aria-atomic=true]")).toHaveCount(1);
});

