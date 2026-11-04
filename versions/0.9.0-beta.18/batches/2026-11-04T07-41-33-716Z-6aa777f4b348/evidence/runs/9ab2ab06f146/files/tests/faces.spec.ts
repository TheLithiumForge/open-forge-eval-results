import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Face } from '../src/game/board/Face.tsx';
import { faceName } from '../src/game/board/faces.ts';

test('all 128 identities have unique names and a 44px grayscale face sheet', async ({ page }, testInfo) => {
  const identities = Array.from({ length: 128 }, (_, id) => faceName(id));
  expect(new Set(identities).size).toBe(128);
  expect(faceName(0)).toBe('cyan solid circle, marker top');
  expect(faceName(64)).toBe('cyan outline circle, marker top');
  const faces = identities.map((name, id) => `<div title="${name}"><div class="face">${renderToStaticMarkup(createElement(Face, { id }))}</div><span>${id}</span></div>`).join('');
  await page.setViewportSize({ width: 900, height: 700 });
  await page.setContent(`<html><head><title>Neon Pairs — 44px grayscale face sheet</title><style>
    *{box-sizing:border-box}body{margin:16px;background:#090b14;color:#f4f6ff;font:14px/24px system-ui}
    h1{font-size:24px;margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:6px}
    .face{width:44px;height:44px;border:2px solid #757c9a;border-radius:8px;background:#111625}
    svg{display:block;width:100%;height:100%;filter:grayscale(1)}span{display:block;text-align:center}
    </style></head><body><h1>128 faces · 44px · grayscale</h1><div class="sheet">${faces}</div></body></html>`);
  await expect(page.locator('svg')).toHaveCount(128);
  await expect(page.locator('svg circle:last-child')).toHaveCount(128);
  const path = testInfo.outputPath('faces-44px-grayscale.png');
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach('grayscale-face-sheet', { path, contentType: 'image/png' });
});
