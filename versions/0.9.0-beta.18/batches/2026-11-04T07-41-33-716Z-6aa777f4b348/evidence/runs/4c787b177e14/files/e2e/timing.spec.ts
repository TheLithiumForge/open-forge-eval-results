import { expect, test } from "@playwright/test";
import { createGame } from "../src/game/board.ts";
import { activateCard } from "../src/game/transitions.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { advance, cardAt, startBoard } from "./helpers.ts";

test("closes a mismatch exactly 800 active milliseconds after an off-tick reveal", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await cardAt(page, 0).click();
  await advance(page, 23);
  await cardAt(page, 1).click();
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 799);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 1);
  expect(await page.locator(".card-revealed").count()).toBe(0);
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
});

test("pauses the mismatch countdown while hidden and restores its exact remainder", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await advance(page, 300);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await advance(page, 5_000);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await advance(page, 499);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 1);
  expect(await page.locator(".card-revealed").count()).toBe(0);
});

test("keeps an imported mismatch paused until Resume then uses its saved remainder", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await advance(page, 500);
  await page.getByRole("button", { name: "Export snapshot" }).click();
  const snapshot: unknown = JSON.parse(await page.getByLabel("Snapshot JSON").inputValue());
  if (typeof snapshot !== "object" || snapshot === null || !("selection" in snapshot) || typeof snapshot.selection !== "object" || snapshot.selection === null || !("remainingMs" in snapshot.selection)) {
    throw new Error("The exported snapshot contains a pending mismatch.");
  }
  expect(snapshot.selection.remainingMs).toBe(300);
  const snapshotText = await page.getByLabel("Snapshot JSON").inputValue();
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(JSON.parse(snapshotText)));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await cardAt(page, 4).click();
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
  await advance(page, 5_000);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(cardAt(page, 4)).toBeFocused();
  await advance(page, 299);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 1);
  expect(await page.locator(".card-revealed").count()).toBe(0);
});

test("uses the exact513ms imported remainder instead of waiting for another interval tick", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  const initial = createGame("np1-4-1");
  if (initial === null) throw new Error("The test deal is valid.");
  const active = activateCard(activateCard(initial, 0), 1);
  if (active.selection.kind !== "mismatch") throw new Error("The test cards mismatch.");
  const mismatch = encodeSnapshot({
    ...active,
    selection: { ...active.selection, remainingMs: 513 },
  });
  await page.getByLabel("Snapshot JSON").fill(mismatch);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await advance(page, 512);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 1);
  expect(await page.locator(".card-revealed").count()).toBe(0);
});
