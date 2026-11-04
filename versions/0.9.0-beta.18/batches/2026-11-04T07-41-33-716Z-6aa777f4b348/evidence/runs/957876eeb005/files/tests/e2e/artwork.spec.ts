import { mkdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Face } from '../../src/game/board/Face.tsx';
import { faceIdentity } from '../../src/game/board/face-identity.ts';

test('renders all 128 real face artworks in a 44px grayscale review sheet', async ({ page }) => {
  const cells: string[] = [];
  for (let marker = 0; marker < 8; marker += 1) {
    for (let column = 0; column < 16; column += 1) {
      const id = marker * 8 + column % 8 + (column >= 8 ? 64 : 0);
      const artwork = renderToStaticMarkup(createElement(Face, { id }));
      cells.push(`<div class="cell"><div class="face" title="${faceIdentity(id).name}">${artwork}</div><div>${id}</div></div>`);
    }
  }
  await page.setViewportSize({ width: 850, height: 700 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>44px face sheet</title>
    <style>body{margin:16px;background:#090B14;color:#F4F6FF;font:14px/24px system-ui}
    h1{font-size:24px;margin:0 0 8px}p{margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:6px;filter:grayscale(1)}
    .cell{text-align:center;font-size:12px;line-height:16px}.face{box-sizing:border-box;width:44px;height:44px;padding:0;border:2px solid #757C9A;border-radius:8px;background:#111625}
    svg{display:block;width:100%;height:100%}</style>
    <body><h1>128 faces · 44px · grayscale</h1><p>Solid faces 0–63 on the left; outline faces 64–127 on the right.<br>Rows follow marker direction; columns follow shape. IDs identify each cell.</p>
    <div class="sheet">${cells.join('')}</div></body></html>`);
  await expect(page.locator('.face')).toHaveCount(128);
  const dimensions = await page.locator('.face').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
  expect(dimensions.every(width => width === 44)).toBe(true);
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/faces-44px-grayscale.png', fullPage: true });
});
