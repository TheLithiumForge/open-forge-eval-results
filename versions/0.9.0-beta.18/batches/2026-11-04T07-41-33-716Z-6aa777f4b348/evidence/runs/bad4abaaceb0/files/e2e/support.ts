import { expect, type Page } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createGame } from "../src/game/transition.ts";
import { generateDeck } from "../src/game/deck.ts";
import { isGridSize } from "../src/game/boardCode.ts";
import { SELECTION_KIND } from "../src/game/constants.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";

export const REPLAYABLE_CODE = "np1-4-1";

export function cardButtons(page: Page) {
  return page.locator(".board-grid > button.card");
}

export function deckFor(boardCode: string): readonly number[] {
  const parts = boardCode.split("-");
  const size = Number(parts[1]);
  const seed = Number(parts[2]);
  if (!isGridSize(size) || !Number.isSafeInteger(seed)) throw new Error("Invalid test board code");
  return generateDeck(size, seed);
}

export function pairsFor(deck: readonly number[]): readonly (readonly [number, number])[] {
  const positions = new Map<number, number[]>();
  deck.forEach((face, index) => {
    const existing = positions.get(face) ?? [];
    existing.push(index);
    positions.set(face, existing);
  });
  const pairs: Array<readonly [number, number]> = [];
  for (const indexes of positions.values()) {
    const first = indexes[0];
    const second = indexes[1];
    if (first === undefined || second === undefined) throw new Error("Test deck has incomplete pairs");
    pairs.push([first, second]);
  }
  return pairs;
}

export function mismatchFor(deck: readonly number[], excluded: readonly number[] = []): readonly [number, number] {
  for (let first = 0; first < deck.length; first += 1) {
    for (let second = first + 1; second < deck.length; second += 1) {
      if (!excluded.includes(first) && !excluded.includes(second) && deck[first] !== deck[second]) return [first, second];
    }
  }
  throw new Error("Test deck has no distinct faces");
}

export function completedSnapshot(boardCode: string, elapsedMs = 1200): string {
  const game = createGame(boardCode);
  if (!game) throw new Error("Invalid completed snapshot board");
  const matched = Array.from({ length: game.deck.length }, (_, index) => index);
  return encodeSnapshot({
    ...game,
    matched,
    selection: { kind: SELECTION_KIND.closed },
    moves: game.deck.length / 2,
    elapsedMs,
    started: true,
  });
}

export function oneCardSnapshot(boardCode: string, elapsedMs = 1200): string {
  const game = createGame(boardCode);
  if (!game) throw new Error("Invalid unfinished snapshot board");
  const finalPair = pairsFor(game.deck).at(-1);
  if (!finalPair) throw new Error("Expected an unfinished pair");
  const finalPositions = new Set(finalPair);
  const matched = Array.from({ length: game.deck.length }, (_, index) => index)
    .filter((index) => !finalPositions.has(index));
  return encodeSnapshot({
    ...game,
    matched,
    selection: { kind: SELECTION_KIND.one, index: finalPair[0] },
    moves: game.deck.length / 2 - 1,
    elapsedMs,
    started: true,
  });
}

export async function openReproduction(page: Page): Promise<void> {
  const details = page.locator("details.reproduction-controls");
  if ((await details.getAttribute("open")) === null) {
    await page.getByText("Reproduce a game", { exact: true }).click();
  }
}

export async function loadBoard(page: Page, boardCode: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel("Board code").fill(boardCode);
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(cardButtons(page)).toHaveCount(Number(boardCode.split("-")[1]) ** 2);
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel("Snapshot JSON").fill(text);
  await page.getByRole("button", { name: "Load snapshot" }).click();
}

export function offlineHtmlUrl(): string {
  return pathToFileURL(resolve("dist/index.html")).href;
}

export async function revealPairs(page: Page, pairs: readonly (readonly [number, number])[]): Promise<void> {
  const cards = cardButtons(page);
  for (const [first, second] of pairs) {
    await cards.nth(first).evaluate((button: HTMLButtonElement) => button.click());
    await cards.nth(second).evaluate((button: HTMLButtonElement) => button.click());
  }
}

