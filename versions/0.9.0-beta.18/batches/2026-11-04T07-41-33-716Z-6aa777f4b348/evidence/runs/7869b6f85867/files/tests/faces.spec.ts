import { mkdir, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Face } from '../src/game/board/Face.tsx';
import { faceName } from '../src/game/board/faces.ts';

test('all 128 face identities have a 44px grayscale review sheet', async ({ page }) => {
  const faces = Array.from({ length: 128 }, (_, id) => `<figure><div>${renderToStaticMarkup(createElement(Face, { id }))}</div><figcaption>${id}</figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="en"><meta charset="UTF-8"><title>Neon Pairs — grayscale faces at 44px</title>
    <style>body{margin:16px;background:#090B14;color:#F4F6FF;font:14px system-ui}main{display:grid;grid-template-columns:repeat(16,56px);gap:8px}figure{margin:0}figure div{width:44px;height:44px;background:#111625;filter:grayscale(1)}svg{width:100%;height:100%}figcaption{padding-top:4px}</style>
    <h1>128 identities · 44px · grayscale</h1><main>${faces}</main></html>`;
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.setContent(html);
  await expect(page.locator('svg')).toHaveCount(128);
  expect(new Set(Array.from({ length: 128 }, (_, id) => faceName(id))).size).toBe(128);
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/grayscale-faces.html', html);
  await page.screenshot({ path: 'evidence/grayscale-faces.png', fullPage: true });
});
