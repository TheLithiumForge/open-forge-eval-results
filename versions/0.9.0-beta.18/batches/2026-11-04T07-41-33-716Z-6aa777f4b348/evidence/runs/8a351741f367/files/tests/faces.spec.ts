import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Face } from '../src/game/board/Face.tsx';
import { appearance } from '../src/game/board/appearance.ts';

test('128 faces have a 44px grayscale review sheet with separate diagonal markers', async ({ page }) => {
  const faces = Array.from({ length: 128 }, (_, face) => `<figure><div class="face" aria-label="${appearance(face).name}">${
    renderToStaticMarkup(createElement(Face, { face }))}</div><figcaption>${face}</figcaption></figure>`).join('');
  await page.setViewportSize({ width: 832, height: 576 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="UTF-8"><title>44px grayscale face review</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px/20px system-ui}
    h1{font-size:16px;margin:0 0 12px}main{display:grid;grid-template-columns:repeat(16,44px);gap:6px}
    figure{margin:0}.face{width:44px;height:44px;border:2px solid #757C9A;border-radius:8px;background:#111625;filter:grayscale(1)}
    svg{width:100%;height:100%;display:block}figcaption{text-align:center}</style>
    <h1>Neon Pairs · all 128 faces at 44px · grayscale</h1><main>${faces}</main></html>`);
  await expect(page.locator('.face')).toHaveCount(128);
  const names = await page.locator('.face').evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));
  expect(new Set(names).size).toBe(128);
  for (const face of [9, 25, 41, 57, 73, 89, 105, 121]) {
    const marker = page.locator('.face').nth(face).locator('circle').last();
    await expect(marker).toHaveAttribute('r', '5');
    await expect(marker).toHaveAttribute('stroke-width', '3');
    await expect(marker).toHaveAttribute('stroke', '#111625');
  }
  await page.screenshot({ path: 'artifacts/faces-44px-grayscale.png', fullPage: true });
});
