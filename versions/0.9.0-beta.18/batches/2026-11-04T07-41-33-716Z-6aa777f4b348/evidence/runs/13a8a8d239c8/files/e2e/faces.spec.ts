import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { parseBoardCode, type GridSize } from '../src/game/board.ts';
import { faceName } from '../src/game/board/faces.ts';
import { loadBoard, openReproduction } from './helpers.ts';

async function complete(size: GridSize): Promise<string> {
  const boardCode = `np1-${size}-1`;
  const board = parseBoardCode(boardCode);
  if (board === null) throw new Error('The fixture board should be valid.');
  return JSON.stringify({
    version: 1, boardCode,
    matched: Array.from({ length: board.deck.length }, (_value, index) => index),
    selection: { kind: 'closed' }, moves: board.deck.length / 2, elapsedMs: 0, started: true,
  });
}

test('captures all rendered identities in a 44px grayscale sheet and a matched diagonal square', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const board = parseBoardCode('np1-16-1');
  if (board === null) throw new Error('The documented board should be valid.');
  await loadBoard(page, board.boardCode);
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(await complete(16));
  await page.getByRole('button', { name: 'Load snapshot' }).click();

  await page.setViewportSize({ width: 360, height: 800 });
  const squareIndex = board.deck.indexOf(25);
  if (squareIndex < 0) throw new Error('The face ID 25 square should occur in the deal.');
  const squareName = `Row ${Math.floor(squareIndex / 16) + 1}, column ${(squareIndex % 16) + 1}, ${faceName(25)}, matched`;
  const square = page.getByRole('button', { name: squareName });
  await expect(square).toHaveCSS('width', '44px');
  const clearMarker = await square.evaluate((card) => {
    const marker = card.querySelector('.face-marker')?.getBoundingClientRect();
    const badge = card.querySelector('.match-mark')?.getBoundingClientRect();
    return marker && badge
      ? marker.right <= badge.left || badge.right <= marker.left || marker.bottom <= badge.top || badge.bottom <= marker.top
      : false;
  });
  expect(clearMarker).toBe(true);
  await mkdir('evidence', { recursive: true });
  await square.screenshot({ path: 'evidence/matched-bottom-right-square-44.png' });

  const identities = new Map<number, string>();
  board.deck.forEach((face, index) => {
    if (!identities.has(face)) identities.set(face, `Row ${Math.floor(index / 16) + 1}, column ${(index % 16) + 1}, ${faceName(face)}, matched`);
  });
  const samples: Array<{ name: string; svg: string }> = [];
  for (const [, name] of [...identities].sort(([left], [right]) => left - right)) {
    const svg = await page.getByRole('button', { name }).locator('svg').evaluate((element) => element.outerHTML);
    samples.push({ name, svg });
  }
  expect(samples).toHaveLength(128);
  expect(new Set(samples.map((sample) => sample.name))).toHaveProperty('size', 128);
  const tiles = samples.map((sample) => `<div class="tile" aria-label="${sample.name}">${sample.svg}</div>`).join('');
  await page.setContent(`<style>
    *{box-sizing:border-box}body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;
    font:14px system-ui,sans-serif}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:6px;width:max-content}
    .tile{display:grid;width:44px;height:44px;place-items:center;border:2px solid #757C9A;border-radius:8px;
    padding:4px;background:#111625}.tile svg{width:32px;height:32px;filter:grayscale(1)}.face-marker{stroke:#111625;stroke-width:3}
  </style><main class="sheet">${tiles}</main>`);
  await page.screenshot({ path: 'evidence/faces-grayscale-44.png', fullPage: true });
});
