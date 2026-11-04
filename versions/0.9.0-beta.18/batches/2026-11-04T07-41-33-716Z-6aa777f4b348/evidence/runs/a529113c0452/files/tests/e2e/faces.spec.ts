import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { completed, deal, loadProgress, openGame } from './support.ts';

test('all 128 faces retain distinct geometry in a 44px grayscale sheet', async ({ page }) => {
  await openGame(page);
  await loadProgress(page, completed('np1-16-1'));
  const game = deal('np1-16-1');
  const artwork = await page.locator('.card-face').evaluateAll((elements) => elements.map((svg) => {
    const marker = svg.querySelector(':scope > circle');
    return { svg: svg.outerHTML, viewBox: svg.getAttribute('viewBox'),
      radius: marker?.getAttribute('r'), stroke: marker?.getAttribute('stroke'),
      markerWidth: marker?.getAttribute('stroke-width'), x: Number(marker?.getAttribute('cx')),
      y: Number(marker?.getAttribute('cy')), shapeWidth: svg.querySelector('g')?.getAttribute('stroke-width') };
  }));
  expect(artwork).toHaveLength(256);
  const samples: { id: number; svg: string }[] = [];
  for (let marker = 0; marker < 8; marker += 1) {
    for (const fill of [0, 1]) {
      for (let shape = 0; shape < 8; shape += 1) {
        const id = fill * 64 + marker * 8 + shape;
        const sample = artwork[game.board.deck.indexOf(id)];
        if (sample === undefined) throw new Error('Missing face sample.');
        expect(sample.viewBox).toBe('0 0 100 100');
        expect(sample.radius).toBe('5');
        expect(sample.markerWidth).toBe('3');
        expect(sample.stroke).toBe('#111625');
        expect(Math.hypot(sample.x - 50, sample.y - 50)).toBeCloseTo(40, 8);
        expect(sample.shapeWidth).toBe(fill === 1 ? '5' : '0');
        samples.push({ id, svg: sample.svg });
      }
    }
  }
  expect(new Set(samples.map((sample) => sample.svg)).size).toBe(128);
  const sheet = await page.context().newPage();
  await sheet.setViewportSize({ width: 940, height: 700 });
  await sheet.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;background:#090b14;color:#f4f6ff;font:14px/24px system-ui}
    h1{font-size:20px;margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:12px;filter:grayscale(1)}
    figure{margin:0;width:44px}button{display:block;width:44px;height:44px;padding:0;border:2px solid #757c9a;border-radius:8px;background:#111625}
    svg{display:block;width:100%;height:100%}figcaption{text-align:center;font-size:12px;line-height:16px}
    </style></head><body><h1>128 faces · 44px targets · solid left / outline right in each row</h1><div class="sheet">
    ${samples.map(({ id, svg }) => `<figure><button>${svg}</button><figcaption>${id}</figcaption></figure>`).join('')}
    </div></body></html>`);
  expect(await sheet.locator('button').evaluateAll((elements) => elements.every((element) => {
    const rect = element.getBoundingClientRect(); return rect.width === 44 && rect.height === 44;
  }))).toBe(true);
  await mkdir('evidence', { recursive: true });
  await sheet.screenshot({ path: 'evidence/faces-grayscale.png', fullPage: true });
  await sheet.close();
});
