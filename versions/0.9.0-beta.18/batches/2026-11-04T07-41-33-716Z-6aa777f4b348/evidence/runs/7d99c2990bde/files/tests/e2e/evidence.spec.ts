import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { game, loadState } from './helpers.ts';

test('all 128 face identities at 44px in grayscale from public completed snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 1100 });
  await page.goto('/');
  const initial = game('np1-16-1');
  await loadState(page, { ...initial, matched: initial.deck.map((_, index) => index),
    moves: 128, elapsedMs: 1500, started: true });
  const positions = Array.from({ length: 128 }, (_, face) => initial.deck.indexOf(face));
  await page.evaluate(indices => {
    const sheet = document.createElement('section');
    sheet.id = 'test-face-sheet';
    sheet.style.cssText = 'display:grid;grid-template-columns:repeat(16,44px);gap:6px;padding:16px;background:#090B14;filter:grayscale(1);width:max-content';
    const buttons = document.querySelectorAll('button.card');
    for (const [face, index] of indices.entries()) {
      const source = buttons[index];
      if (!source) throw new Error('Missing source face');
      const tile = document.createElement('div');
      tile.style.cssText = 'display:grid;gap:4px;width:44px';
      const button = source.cloneNode(true);
      if (!(button instanceof HTMLButtonElement)) throw new Error('Missing card button');
      button.style.width = '44px';
      button.style.height = '44px';
      button.querySelector('.card-check')?.remove();
      const label = document.createElement('span');
      label.style.cssText = 'font-size:12px;line-height:16px;text-align:center';
      label.textContent = String(face);
      tile.append(button, label);
      sheet.append(tile);
    }
    document.body.prepend(sheet);
  }, positions);
  await expect(page.locator('#test-face-sheet .card-face')).toHaveCount(128);
  const geometry = await page.locator('#test-face-sheet .card-face').evaluateAll(faces => faces.map(svg => {
    const marker = svg.lastElementChild;
    if (!marker) throw new Error('Missing marker');
    return { viewBox: svg.getAttribute('viewBox'), x: Number(marker.getAttribute('cx')),
      y: Number(marker.getAttribute('cy')), radius: marker.getAttribute('r'), stroke: marker.getAttribute('stroke-width') };
  }));
  for (const marker of geometry) {
    expect(marker.viewBox).toBe('0 0 100 100');
    expect(Math.hypot(marker.x - 50, marker.y - 50)).toBeCloseTo(40, 6);
    expect(marker.radius).toBe('5');
    expect(marker.stroke).toBe('3');
  }
  await mkdir('evidence', { recursive: true });
  await page.locator('#test-face-sheet').screenshot({ path: 'evidence/faces-grayscale.png' });
});
