import { expect, test } from "@playwright/test";
import { createGame } from "../src/game/board.ts";
import { MAX_ELAPSED_MS, MAX_MOVES } from "../src/game/constants.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { activateCard } from "../src/game/transitions.ts";
import { cardAt, startBoard, advance } from "./helpers.ts";

function atClockLimitSnapshot(): string {
  const initial = createGame("np1-4-1");
  if (initial === null) throw new Error("The test deal is valid.");
  return encodeSnapshot({
    ...activateCard(initial, 0),
    moves: MAX_MOVES,
    elapsedMs: MAX_ELAPSED_MS,
  });
}

function activeSnapshot(elapsedMs: number): string {
  const initial = createGame("np1-4-1");
  if (initial === null) throw new Error("The test deal is valid.");
  return encodeSnapshot({ ...activateCard(initial, 0), elapsedMs });
}

test("a new deal during a mismatch discards its deadline and protects the new turn", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await advance(page, 300);
  await page.getByRole("button", { name: "New Game" }).click();
  const code = await page.getByLabel("Board code").inputValue();
  expect(code).not.toBe("np1-4-1");
  await cardAt(page, 0).click();
  await advance(page, 1_000);
  expect(await cardAt(page, 0).getAttribute("aria-label")).toContain("revealed");
  expect(await page.locator(".card-revealed").count()).toBe(1);
  expect(await page.getByText("Moves: 0", { exact: true }).count()).toBe(1);
});

test("caps visible time and moves without blocking later matches", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await page.getByLabel("Snapshot JSON").fill(atClockLimitSnapshot());
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await cardAt(page, 11).click();
  await expect(page.getByText("Moves: 999999", { exact: true })).toBeVisible();
  await expect(page.getByText("Pairs: 1/8", { exact: true })).toBeVisible();
  await expect(page.getByText("Time: 5999:59", { exact: true })).toBeVisible();
});

test("starts elapsed time at the first reveal and formats minutes beyond59", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await advance(page, 5_000);
  await expect(page.getByText("Time: 0:00", { exact: true })).toBeVisible();
  await cardAt(page, 0).click();
  await advance(page, 999);
  await expect(page.getByText("Time: 0:00", { exact: true })).toBeVisible();
  await advance(page, 1);
  await expect(page.getByText("Time: 0:01", { exact: true })).toBeVisible();

  await page.getByLabel("Snapshot JSON").fill(activeSnapshot(3_600_000));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByText("Time: 60:00", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await advance(page, 100);
  await expect(page.getByText("Time: 60:00", { exact: true })).toBeVisible();
});
