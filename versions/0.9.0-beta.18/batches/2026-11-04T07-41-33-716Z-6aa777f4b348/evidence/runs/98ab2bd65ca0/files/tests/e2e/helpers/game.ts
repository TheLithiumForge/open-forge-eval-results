import { createGame } from "../../../src/game/create.ts";
import { activateCard } from "../../../src/game/transition.ts";
import { advanceGame } from "../../../src/game/clock.ts";
import { encodeSnapshot } from "../../../src/game/snapshot.ts";
import type { Page } from "@playwright/test";

export type PositionPair = readonly [number, number];

export function pairsForCode(boardCode: string): readonly PositionPair[] {
  const game = createGame(boardCode);
  if (game === null) throw new Error(`Invalid test board: ${boardCode}`);
  const waiting = new Map<number, number>();
  const pairs: PositionPair[] = [];
  game.board.deck.forEach((face, index) => {
    const first = waiting.get(face);
    if (first === undefined) waiting.set(face, index);
    else {
      waiting.delete(face);
      pairs.push([first, index]);
    }
  });
  return pairs.sort((left, right) => left[0] - right[0]);
}

export function completedSnapshot(boardCode: string): string {
  const game = createGame(boardCode);
  if (game === null) throw new Error(`Invalid test board: ${boardCode}`);
  let state = game;
  for (const [first, second] of pairsForCode(boardCode)) {
    state = activateCard(activateCard(state, first), second);
  }
  return encodeSnapshot(state);
}

export function pendingMismatchSnapshot(boardCode: string, passedMs: number): string {
  const game = createGame(boardCode);
  if (game === null) throw new Error(`Invalid test board: ${boardCode}`);
  const state = advanceGame(activateCard(activateCard(game, 1), 2), passedMs);
  return encodeSnapshot(state);
}

export async function loadBoard(page: Page, boardCode: string): Promise<void> {
  const details = page.locator("details.reproduction-panel");
  if (await details.getAttribute("open") === null) {
    await page.getByText("Reproduce a game", { exact: true }).click();
  }
  await page.getByLabel("Board code").fill(boardCode);
  await page.getByRole("button", { name: "Load board", exact: true }).click();
}

export function cardAt(page: Page, index: number) {
  return page.locator(".card-button").nth(index);
}

export async function solveWithPointer(page: Page, boardCode: string): Promise<void> {
  for (const [first, second] of pairsForCode(boardCode)) {
    await cardAt(page, first).click();
    await cardAt(page, second).click();
  }
}
