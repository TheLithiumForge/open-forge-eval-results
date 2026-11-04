import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect, loadSnapshot } from './game.ts';
import { createGame } from '../../src/game/state.ts';

test('all128 faces at44px: normalized marker geometry and grayscale review sheet', async ({ page }, info) => {
  await page.goto('/');
  const state = createGame('np1-16-1');
  if (!state) throw new Error('Invalid face-sheet board');
  await loadSnapshot(page, { version: 1, boardCode: state.board.code,
    matched: Array.from({ length: 256 }, (_, index) => index), selection: { kind: 'closed' },
    moves: 128, elapsedMs: 0, started: true });
  const faces = await page.locator('.board').evaluate((board, deck) => {
    return Array.from({ length: 128 }, (_, id) => {
      const button = board.querySelectorAll('button').item(deck.indexOf(id));
      const svg = button?.querySelector('svg');
      const shape = svg?.firstElementChild;
      const marker = svg?.lastElementChild;
      if (!svg || !shape || !marker) throw new Error('Missing face artwork');
      return { id, name: button.getAttribute('aria-label') ?? '', svg: svg.outerHTML,
        box: svg.getAttribute('viewBox'), fill: shape.getAttribute('fill'),
        outline: shape.getAttribute('stroke-width'), radius: marker.getAttribute('r'),
        markerStroke: marker.getAttribute('stroke-width'),
        x: Number(marker.getAttribute('cx')), y: Number(marker.getAttribute('cy')) };
    });
  }, state.deck);
  expect(new Set(faces.map((face) => face.svg)).size).toBe(128);
  for (const face of faces) {
    expect(face.box).toBe('0 0 100 100');
    expect(face.radius).toBe('5');
    expect(face.markerStroke).toBe('3');
    expect(Math.hypot(face.x - 50, face.y - 50)).toBeCloseTo(40, 8);
    if (face.id >= 64) { expect(face.fill).toBe('none'); expect(face.outline).toBe('5'); }
  }
  const sheet = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs grayscale faces</title>
<style>body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px/24px system-ui}
h1{font-size:24px;margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:12px;filter:grayscale(1)}
figure{margin:0;width:44px;text-align:center}.face{width:44px;height:44px;box-sizing:border-box;border:2px solid #757C9A;border-radius:8px;background:#111625}
svg{display:block;width:100%;height:100%}figcaption{line-height:24px}</style>
<h1>All 128 faces · 44px · grayscale</h1><div class="sheet">${faces.map((face) => `<figure><div class="face">${face.svg}</div><figcaption>${face.id}</figcaption></figure>`).join('')}</div></html>`;
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/grayscale-faces.html', sheet);
  await page.setViewportSize({ width: 928, height: 768 });
  await page.setContent(sheet);
  await page.screenshot({ path: 'artifacts/grayscale-faces.png', fullPage: true });
  await info.attach('grayscale-faces-44px', { path: 'artifacts/grayscale-faces.png', contentType: 'image/png' });
});
