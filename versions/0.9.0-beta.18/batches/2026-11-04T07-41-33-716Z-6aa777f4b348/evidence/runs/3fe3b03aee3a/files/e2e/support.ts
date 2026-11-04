import type { Page } from "@playwright/test";
import { createGame } from "../src/game/board.ts";

export async function startDeal(page: Page, code: string): Promise<void> {
  const panel = page.locator("details");
  if (!(await panel.evaluate((element) => element.hasAttribute("open")))) {
    await page.getByText("Reproduce a game", { exact: true }).click();
  }
  await page.getByLabel("Board code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Load board", exact: true }).click();
}

export function matchingPairs(code: string): Array<readonly [number, number]> {
  const deck = createGame(code).board.deck;
  const positions = new Map<number, number[]>();
  for (let index = 0; index < deck.length; index += 1) {
    const face = deck[index];
    if (face === undefined) throw new Error("The documented deal has a missing face.");
    const pair = positions.get(face) ?? [];
    pair.push(index);
    positions.set(face, pair);
  }
  const result: Array<readonly [number, number]> = [];
  for (const pair of positions.values()) {
    const first = pair[0];
    const second = pair[1];
    if (first !== undefined && second !== undefined) result.push([first, second]);
  }
  return result;
}

export async function playAllPairs(page: Page, code: string): Promise<number> {
  const pairs = matchingPairs(code);
  await page.evaluate((turns) => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".memory-card");
    for (const [first, second] of turns) {
      const firstCard = buttons.item(first);
      const secondCard = buttons.item(second);
      if (firstCard === null || secondCard === null) throw new Error("A documented card is missing.");
      firstCard.click();
      secondCard.click();
    }
  }, pairs);
  return pairs.length;
}

export function closedSnapshot(code: string): string {
  return JSON.stringify({ version: 1, boardCode: code, matched: [], selection: { kind: "closed" },
    moves: 0, elapsedMs: 0, started: false });
}

export function completedSnapshot(code: string, moves: number, elapsedMs = 0): string {
  const count = createGame(code).board.deck.length;
  return JSON.stringify({ version: 1, boardCode: code,
    matched: Array.from({ length: count }, (_, index) => index),
    selection: { kind: "closed" }, moves, elapsedMs, started: true });
}

export function unfinishedWinningSnapshot(code: string): Readonly<{ text: string; finalPair: readonly [number, number] }> {
  const pairs = matchingPairs(code);
  const completedPairs = pairs.slice(0, pairs.length - 1);
  const finalPair = pairs.at(-1);
  if (finalPair === undefined) throw new Error("The board needs at least one pair.");
  const matched = completedPairs.flatMap(([first, second]) => [first, second]);
  const text = JSON.stringify({ version: 1, boardCode: code, matched,
    selection: { kind: "one", index: finalPair[0] }, moves: completedPairs.length,
    elapsedMs: 61_000, started: true });
  return { text, finalPair };
}

const faceColors = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
const faceShapes = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const markerPositions = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;

export function accessibleFaceName(face: number): string {
  const color = faceColors[Math.floor(face / 8) % 8];
  const shape = faceShapes[face % 8];
  const fill = face < 64 ? "solid" : "outline";
  const marker = markerPositions[Math.floor(face / 8) % 8];
  if (color === undefined || shape === undefined || marker === undefined) throw new Error("Unknown face identity.");
  return `${color} ${fill} ${shape}, marker ${marker}`;
}

export function representativeFaces(code: string): Array<Readonly<{ face: number; index: number }>> {
  const deck = createGame(code).board.deck;
  const result: Array<Readonly<{ face: number; index: number }>> = [];
  for (let face = 0; face < deck.length / 2; face += 1) {
    const index = deck.indexOf(face);
    if (index < 0) throw new Error(`The documented board is missing face ${face}.`);
    result.push({ face, index });
  }
  return result;
}
