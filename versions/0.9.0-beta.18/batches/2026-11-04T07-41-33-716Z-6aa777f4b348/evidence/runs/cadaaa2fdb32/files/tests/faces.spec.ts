import { mkdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Face } from '../src/game/board/Face.tsx';
import { describeFace } from '../src/game/board/faces.ts';

test('all 128 identities in a 44px grayscale face sheet', async ({ page }) => {
  const names = Array.from({ length: 128 }, (_, id) => describeFace(id).name);
  expect(new Set(names).size).toBe(128);
  expect(names[0]).toBe('cyan solid circle, marker top');
  expect(names[64]).toBe('cyan outline circle, marker top');
  const cells = names.map((name, id) => `<div title="${name}"><figure>${renderToStaticMarkup(createElement(Face, { id }))}</figure><span>${id}</span></div>`).join('');
  await page.setViewportSize({ width: 960, height: 700 });
  await page.setContent(`<html lang="en"><head><title>Neon Pairs face sheet</title><style>
    * { box-sizing: border-box; margin:0; } body { background:#090B14; color:#F4F6FF; padding:16px; font:14px/24px system-ui; }
    h1 { font-size:24px; margin-bottom:16px; } main { display:grid; grid-template-columns:repeat(16,44px); gap:12px; }
    figure { width:44px; height:44px; background:#111625; filter:grayscale(1); } svg { width:44px; height:44px; } span { display:block; text-align:center; }
    </style></head><body><h1>128 faces · 44px · grayscale</h1><main>${cells}</main></body></html>`);
  await expect(page.locator('svg')).toHaveCount(128);
  const markers = await page.locator('svg > circle').evaluateAll(elements => elements.map(element =>
    ({ radius: element.getAttribute('r'), stroke: element.getAttribute('stroke-width') })));
  expect(markers).toEqual(Array.from({ length: 128 }, () => ({ radius: '5', stroke: '3' })));
  await mkdir('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/face-sheet.png', fullPage: true });
});
