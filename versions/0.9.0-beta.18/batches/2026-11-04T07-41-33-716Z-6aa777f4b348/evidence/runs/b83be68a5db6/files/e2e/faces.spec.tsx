import { mkdir } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Face } from '../src/game/board/Face.tsx';
import { faceParts } from '../src/game/board/face.ts';

test('exports all 128 grayscale faces at the 44px card size', async ({ page }) => {
  const faces = Array.from({ length: 128 }, (_, id) =>
    `<div><div class="card" aria-label="${faceParts(id).name}">${renderToStaticMarkup(<Face id={id} />)}</div><span>${id}</span></div>`);
  await page.setViewportSize({ width: 832, height: 640 });
  await page.setContent(`<style>
    * { box-sizing:border-box } body { margin:16px; background:#090B14; color:#F4F6FF; font:12px system-ui; filter:grayscale(1) }
    main { display:grid; grid-template-columns:repeat(16,44px); gap:6px }
    .card { width:44px; height:44px; padding:0; background:#111625; border:2px solid #757C9A; border-radius:8px }
    svg { display:block; width:100%; height:100% } span { display:block; text-align:center }
  </style><h1>Neon Pairs · 128 faces · 44px · grayscale</h1><main>${faces.join('')}</main>`);
  await expect(page.locator('.card')).toHaveCount(128);
  expect(await page.locator('.card').first().evaluate(card => card.getBoundingClientRect().width)).toBe(44);
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/faces-grayscale.png', fullPage: true });
});
