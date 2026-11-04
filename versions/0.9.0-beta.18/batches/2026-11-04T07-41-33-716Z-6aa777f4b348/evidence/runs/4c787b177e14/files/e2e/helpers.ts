import type { Page } from "@playwright/test";
import { createGame } from "../src/game/board.ts";

export async function startBoard(page: Page, code = "np1-4-1"): Promise<void> {
  if (page.url() === "about:blank") await page.goto("/");
  const details = page.locator(".reproduction-details");
  if ((await details.getAttribute("open")) === null) {
    await details.locator("summary").click();
  }
  const boardCode = page.getByLabel("Board code");
  await boardCode.fill(code);
  await page.getByRole("button", { name: "Load board" }).click();
}

export function cardAt(page: Page, index: number) {
  return page.locator(".board-grid > button").nth(index);
}

export async function advance(page: Page, milliseconds: number): Promise<void> {
  await page.clock.runFor(milliseconds);
}

export function matchingPairs(code: string): readonly (readonly [number, number])[] {
  const game = createGame(code);
  if (game === null) throw new Error("The test deal is valid.");
  const pending = new Map<number, number>();
  const pairs: [number, number][] = [];
  game.board.deck.forEach((face, index) => {
    const mate = pending.get(face);
    if (mate === undefined) pending.set(face, index);
    else {
      pairs.push([mate, index]);
      pending.delete(face);
    }
  });
  return pairs;
}

export function facePositions(code: string): readonly (readonly [number, number])[] {
  const game = createGame(code);
  if (game === null) throw new Error("The test deal is valid.");
  const positions: [number, number][] = [];
  for (let face = 0; face < 128; face += 1) {
    const position = game.board.deck.findIndex((candidate) => candidate === face);
    if (position < 0) throw new Error("Every documented face appears on the 16-by-16 board.");
    positions.push([face, position]);
  }
  return positions;
}

export async function finishBoardByClicks(page: Page, size: number, misses = 0): Promise<void> {
  const deal = createGame(`np1-${size}-1`);
  if (deal === null) throw new Error("The test deal is valid.");
  const pairToMiss = deal.board.deck[0] !== deal.board.deck[1] ? [0, 1] : [0, 2];
  for (let miss = 0; miss < misses; miss += 1) {
    await cardAt(page, pairToMiss[0] ?? 0).click();
    await cardAt(page, pairToMiss[1] ?? 1).click();
    await advance(page, 800);
  }
  const pairs = matchingPairs(`np1-${size}-1`);
  const positions = pairs.flatMap(([first, second]) => [first, second]);
  await page.evaluate((indices) => {
    const cards = document.querySelectorAll<HTMLButtonElement>(".board-grid > button");
    for (const index of indices) cards.item(index)?.click();
  }, positions);
}
