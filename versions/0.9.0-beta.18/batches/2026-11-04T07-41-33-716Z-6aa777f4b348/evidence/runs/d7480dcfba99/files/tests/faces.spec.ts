import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { loadSnapshot } from './helpers.ts';
import { generateBoard } from '../src/game/boardCode.ts';

test('all 128 production faces at 44px in grayscale', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, { version: 1, boardCode: 'np1-16-1', matched: Array.from({ length: 256 }, (_, index) => index),
    selection: { kind: 'closed' }, moves: 128, elapsedMs: 0, started: true });
  const board = generateBoard('np1-16-1');
  if (!board) throw new Error('Invalid test board');
  const positions = Array.from({ length: 128 }, (_, face) => board.deck.indexOf(face));
  const count = await page.evaluate(indices => {
    const cards = document.querySelectorAll('.card');
    const sheet = document.createElement('div');
    sheet.id = 'face-sheet';
    sheet.style.cssText = 'display:grid;grid-template-columns:repeat(16,44px);gap:6px;padding:16px;width:max-content;filter:grayscale(1);background:#090B14';
    for (const position of indices) {
      const svg = cards[position]?.querySelector('svg')?.cloneNode(true);
      if (!svg) throw new Error('Missing face SVG');
      const cell = document.createElement('div');
      cell.style.cssText = 'width:44px;height:44px;background:#111625';
      cell.append(svg);
      sheet.append(cell);
    }
    document.body.replaceChildren(sheet);
    return sheet.children.length;
  }, positions);
  expect(count).toBe(128);
  await mkdir('artifacts', { recursive: true });
  await page.locator('#face-sheet').screenshot({ path: 'artifacts/faces-grayscale-44px.png' });
});
