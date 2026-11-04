import { expect, type Page } from "@playwright/test";
import { parseBoardCode } from "../src/game/boardCode.ts";

export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const;
export type BoardSize = (typeof BOARD_SIZES)[number];

export function snapshot(code: string, openFaces: readonly number[] = []) {
  const board = parseBoardCode(code);
  if (board === null) throw new Error("Test board code must be valid.");
  const open = new Set(openFaces);
  const matched = board.deck.flatMap((face, index) => open.has(face) ? [] : [index]);
  const moves = matched.length / 2;
  return { version: 1, boardCode: code, matched, selection: { kind: "closed" }, moves, elapsedMs: 0, started: true };
}

export function positionsForFaces(code: string, faces: readonly number[]): number[] {
  const board = parseBoardCode(code);
  if (board === null) throw new Error("Test board code must be valid.");
  return board.deck.flatMap((face, index) => faces.includes(face) ? [index] : []);
}

export async function openReproduction(page: Page): Promise<void> {
  const disclosure = page.locator("details");
  if (await disclosure.getAttribute("open") === null) await page.getByText("Reproduce a game", { exact: true }).click();
}

export async function loadSnapshot(page: Page, value: unknown): Promise<void> {
  await openReproduction(page);
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(value));
  await page.getByRole("button", { name: "Load snapshot" }).click();
}

export async function loadBoard(page: Page, code: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel("Board code").fill(code);
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.getByLabel("Board code")).toHaveValue(code);
}

export async function startAt(page: Page, code = "np1-4-1"): Promise<void> {
  await page.goto("/");
  await loadBoard(page, code);
}

export async function moveByArrows(page: Page, from: number, to: number, size: number): Promise<void> {
  let row = Math.floor(from / size);
  let column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  while (column < targetColumn) { await page.keyboard.press("ArrowRight"); column += 1; }
  while (column > targetColumn) { await page.keyboard.press("ArrowLeft"); column -= 1; }
  while (row < targetRow) { await page.keyboard.press("ArrowDown"); row += 1; }
  while (row > targetRow) { await page.keyboard.press("ArrowUp"); row -= 1; }
}
