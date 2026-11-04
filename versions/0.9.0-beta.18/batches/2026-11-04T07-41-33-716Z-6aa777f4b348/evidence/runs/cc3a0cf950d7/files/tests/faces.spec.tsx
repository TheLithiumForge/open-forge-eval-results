import { expect, test } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Face } from '../src/game/board/Face.tsx';
import { faceName } from '../src/game/board/faces.ts';

test('all 128 faces at minimum size in a grayscale review sheet', async ({ page }, testInfo) => {
  const faces = Array.from({ length: 128 }, (_, id) =>
    `<div title="${faceName(id)}"><div class="face">${renderToStaticMarkup(<Face id={id} />)}</div><small>${id}</small></div>`).join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs · grayscale face sheet</title>
    <style>body{margin:24px;background:#090B14;color:#F4F6FF;font:14px system-ui}
    h1{font-size:24px}main{display:grid;grid-template-columns:repeat(16,44px);gap:12px}
    .face{width:44px;height:44px;background:#111625;filter:grayscale(1)}small{display:block;text-align:center}</style>
    <h1>128 faces · 44px · grayscale</h1><p>Shape × marker × fill. Solid: 0–63. Outline: 64–127.</p><main>${faces}</main></html>`;
  await page.setViewportSize({ width: 960, height: 800 });
  await page.setContent(html);
  await expect(page.locator('.face')).toHaveCount(128);
  await page.screenshot({ path: testInfo.outputPath('faces-grayscale.png'), fullPage: true });
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/faces-grayscale.html', html);
  await page.screenshot({ path: 'artifacts/faces-grayscale.png', fullPage: true });
  await testInfo.attach('grayscale-review-sheet', { body: html, contentType: 'text/html' });
});
