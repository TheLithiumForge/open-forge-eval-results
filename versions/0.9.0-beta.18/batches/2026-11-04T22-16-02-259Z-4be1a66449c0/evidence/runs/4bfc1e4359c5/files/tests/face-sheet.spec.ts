import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDeck } from "../src/game/board-code.ts";

test("renders a 44px grayscale sheet of every face identity", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-16-1");
  await page.getByRole("button", { name: "Load board" }).click();
  const complete = {
    version: 1,
    boardCode: "np1-16-1",
    matched: Array.from({ length: 256 }, (_, index) => index),
    selection: { kind: "closed" },
    moves: 128,
    elapsedMs: 1000,
    started: true,
  };
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(complete));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await page.addStyleTag({ content: `
    .boardScroll { width: max-content; max-width: none; max-height: none; overflow: visible; }
    .boardGrid { --card-size: 44px; margin: 0; }
    .memoryCard { filter: grayscale(1); }
    .memoryCard.isMatched { border-color: #757C9A; }
    .matchedMark { display: none; }
  ` });
  const deck = generateDeck(16, 1);
  const seen = new Set<number>();
  const duplicates: number[] = [];
  deck.forEach((face, index) => {
    if (seen.has(face)) duplicates.push(index);
    else seen.add(face);
  });
  await page.locator(".memoryCard").evaluateAll((cards, hiddenIndexes) => {
    for (const index of hiddenIndexes) {
      const card = cards[index];
      if (card) card.style.display = "none";
    }
  }, duplicates);
  const sheet = page.locator(".boardGrid");
  expect(await sheet.locator(".memoryCard:visible").count()).toBe(128);
  const output = fileURLToPath(new URL("../evidence/face-sheet.png", import.meta.url));
  await mkdir(dirname(output), { recursive: true });
  await sheet.screenshot({ path: output });
});
