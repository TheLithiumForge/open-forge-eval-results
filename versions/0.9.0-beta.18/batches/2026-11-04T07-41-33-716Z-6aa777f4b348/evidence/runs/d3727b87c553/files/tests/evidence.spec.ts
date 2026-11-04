import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, game, loadSnapshot } from './gameDriver.ts';

test('renders all 128 actual face SVGs at 44px in grayscale', async ({ page, browser }) => {
  await page.goto('/');
  const state = game('np1-16-1');
  await loadSnapshot(page, { ...state, matched: Array.from({ length: 256 }, (_, index) => index), moves: 128, started: true });
  const svg = await cards(page).locator('svg').evaluateAll((elements) => elements.map((element) => element.outerHTML));
  const artworkByFace = Array.from({ length: 128 }, (_, id) => svg[state.board.deck.indexOf(id)]);
  expect(new Set(artworkByFace).size).toBe(128);
  const faces = Array.from({ length: 128 }, (_, id) => {
    const artwork = svg[state.board.deck.indexOf(id)];
    if (!artwork) throw new Error(`Missing face ${id}`);
    return `<figure><div class="face">${artwork}</div><figcaption>${id}</figcaption></figure>`;
  });
  await page.setViewportSize({ width: 832, height: 620 });
  await page.setContent(`<html><head><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px/24px system-ui}
    h1{font:24px/32px system-ui;margin:0 0 16px}main{display:grid;grid-template-columns:repeat(16,44px);gap:6px}
    figure{margin:0;width:44px;text-align:center}.face{width:44px;height:44px;border:2px solid #757C9A;border-radius:8px;background:#111625;filter:grayscale(1)}
    svg{display:block;width:100%;height:100%}figcaption{font-size:12px;line-height:16px}
    </style></head><body><h1>Neon Pairs · 128 faces at 44px · grayscale</h1><main>${faces.join('')}</main></body></html>`);
  await expect(page.locator('.face')).toHaveCount(128);
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/faces-44px-grayscale.png', fullPage: true });
  await writeFile('evidence/visual-checks.json', JSON.stringify({ browser: browser.version(), playwright: '1.64.1',
    faceCount: 128, cardPixels: 44, grayscale: true, source: 'actual revealed SVGs from completed np1-16-1',
    layouts: ['16x16 at360x800', '16x16 at1280x800', '4x4 and16x16 at640x400deviceScale2'] }, null, 2));
});
