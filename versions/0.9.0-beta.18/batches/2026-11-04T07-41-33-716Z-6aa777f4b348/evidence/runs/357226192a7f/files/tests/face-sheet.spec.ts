import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cards, completedSnapshot, knownState, loadSnapshot } from './helpers.ts';

test('exports all 128 real face SVGs in a grayscale 44px review sheet', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, completedSnapshot('np1-16-1', 128));
  const game = knownState('np1-16-1');
  await expect(page.locator('.board-grid svg')).toHaveCount(256);
  const rendered = await cards(page).evaluateAll(elements => elements.map(element => ({
    svg: element.querySelector('svg')?.outerHTML, name: element.getAttribute('aria-label'),
  })));
  const tiles = Array.from({ length: 128 }, (_, id) => {
    const face = rendered[game.deck.indexOf(id)];
    if (!face?.svg) throw new Error('Missing face ' + id);
    return '<div><div class="card" title="' + face.name + '">' + face.svg + '</div><small>' + id + '</small></div>';
  });
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs · 128 faces</title>'
    + '<style>body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px system-ui}'
    + 'h1{font-size:24px;margin:0 0 16px}p{margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:6px}'
    + '.card{width:44px;height:44px;box-sizing:border-box;border:2px solid #757C9A;border-radius:8px;background:#111625;filter:grayscale(1)}'
    + 'svg{display:block;width:100%;height:100%}small{display:block;text-align:center}</style>'
    + '<h1>Neon Pairs · 128 faces</h1><p>44px cards · grayscale · face IDs 0–127</p>'
    + '<main class="sheet">' + tiles.join('') + '</main></html>';
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/face-sheet.html', html);
  await page.setViewportSize({ width: 840, height: 700 });
  await page.setContent(html);
  await page.screenshot({ path: 'evidence/face-sheet.png', fullPage: true });
});
