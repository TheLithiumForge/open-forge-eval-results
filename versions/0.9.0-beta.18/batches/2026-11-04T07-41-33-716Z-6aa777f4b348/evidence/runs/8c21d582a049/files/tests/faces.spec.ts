import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { faceIdentity } from '../src/game/board/faceIdentity.ts';
import { cards, loadSnapshot, openGame, snapshot } from './game.ts';

test('all 128 faces have distinct names, specified geometry and a 44px grayscale sheet (V10–V13)', async ({ page, context }) => {
  await openGame(page); await loadSnapshot(page, snapshot(16));
  const game = createGame('np1-16-1');
  if (!game) throw new Error('Invalid fixture board');
  const artwork = await cards(page).evaluateAll(elements => elements.map(card => card.querySelector('svg')?.outerHTML ?? ''));
  const names = new Set<string>();
  const tiles: string[] = [];
  for (let marker = 0; marker < 8; marker++) {
    for (let fill = 0; fill < 2; fill++) {
      for (let shape = 0; shape < 8; shape++) {
        const id = fill * 64 + marker * 8 + shape;
        const identity = faceIdentity(id); names.add(identity.name);
        const index = game.board.deck.indexOf(id);
        await expect(cards(page).nth(index)).toHaveAccessibleName(new RegExp(identity.name + ', matched$'));
        const svg = cards(page).nth(index).locator('svg');
        await expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
        const mark = svg.locator(':scope > circle');
        await expect(mark).toHaveAttribute('r', '5');
        await expect(mark).toHaveAttribute('stroke-width', '3');
        expect(Math.hypot(Number(await mark.getAttribute('cx')) - 50, Number(await mark.getAttribute('cy')) - 50)).toBeCloseTo(40, 8);
        tiles.push(`<div class="tile"><div class="face">${artwork[index] ?? ''}</div><span>${id}</span></div>`);
      }
    }
  }
  expect(names.size).toBe(128);
  const sheet = await context.newPage();
  await sheet.setViewportSize({ width: 850, height: 700 });
  await sheet.setContent(`<html><head><title>Neon Pairs grayscale face sheet</title><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px system-ui}
    h1{font-size:20px;margin:0 0 8px}p{margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:12px 6px}
    .tile{text-align:center}.face{width:44px;height:44px;border:2px solid #757C9A;border-radius:8px;background:#111625;filter:grayscale(1)}
    svg{display:block;width:40px;height:40px}span{font-size:12px;line-height:16px}
    </style></head><body><h1>Neon Pairs · all 128 identities at 44px</h1>
    <p>Each row: eight solid shapes, then eight outline shapes. Rows follow the eight marker positions.</p>
    <div class="sheet">${tiles.join('')}</div></body></html>`);
  await mkdir('evidence', { recursive: true });
  await sheet.screenshot({ path: 'evidence/faces-grayscale-44px.png', fullPage: true });
  await sheet.close();
});
