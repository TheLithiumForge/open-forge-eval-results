import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { cards, gameFor, loadSnapshot, openGame, progress } from './gameHarness.ts';

test('all 128 faces at 44px in grayscale, including diagonal square markers', async ({ page }) => {
  await openGame(page);
  const game = gameFor('np1-16-1');
  await loadSnapshot(page, JSON.stringify({ version: 1, boardCode: game.board.code,
    matched: game.deck.map((_, index) => index), selection: { kind: 'closed' },
    moves: 128, elapsedMs: 0, started: true }));
  const positions = Array.from({ length: 128 }, (_, face) => game.deck.indexOf(face));
  await page.evaluate((indices) => {
    const board = [...document.querySelectorAll('.card')];
    const sheet = document.createElement('section'); sheet.id = 'test-face-sheet';
    sheet.style.cssText = 'display:grid;grid-template-columns:repeat(8,44px);gap:6px;padding:16px;background:#111625;filter:grayscale(1);width:max-content';
    for (const index of indices) {
      const original = board[index];
      if (!original) throw new Error('Missing face.');
      const clone = original.cloneNode(true);
      if (!(clone instanceof HTMLButtonElement)) throw new Error('Not a button.');
      clone.querySelector('.card-check')?.remove();
      clone.style.cssText = 'width:44px;height:44px;min-width:44px;min-height:44px';
      sheet.append(clone);
    }
    document.body.replaceChildren(sheet);
  }, positions);
  const svgs = page.locator('#test-face-sheet svg');
  await expect(svgs).toHaveCount(128);
  expect(new Set(await svgs.evaluateAll((elements) => elements.map((svg) => svg.outerHTML))).size).toBe(128);
  const artwork = await svgs.evaluateAll((elements) => elements.map((svg) => {
    const marker = svg.querySelector('circle'); const shape = svg.querySelector('path');
    if (!marker || !shape) throw new Error('Missing face artwork.');
    return { x: Number(marker.getAttribute('cx')) - 50, y: Number(marker.getAttribute('cy')) - 50,
      radius: marker.getAttribute('r'), markerStroke: marker.getAttribute('stroke-width'),
      background: marker.getAttribute('stroke'), viewBox: svg.getAttribute('viewBox'),
      fill: shape.getAttribute('fill') };
  }));
  for (const face of artwork) {
    const { x, y } = face;
    expect(Math.hypot(x, y)).toBeCloseTo(40, 6);
    expect(face.radius).toBe('5'); expect(face.markerStroke).toBe('3');
    expect(face.viewBox).toBe('0 0 100 100');
  }
  for (const id of [9, 25, 41, 57, 73, 89, 105, 121]) {
    expect(artwork[id]?.fill).toEqual(id < 64 ? expect.stringMatching(/#[0-9A-F]{6}/) : 'none');
    expect(artwork[id]?.background).toBe('#111625');
  }
  await mkdir('evidence', { recursive: true });
  await page.locator('#test-face-sheet').screenshot({ path: 'evidence/faces-44px-grayscale.png' });
});

test('win pulses once, then stays static; reduced motion removes all motion', async ({ page }) => {
  await openGame(page); await loadSnapshot(page, progress());
  await expect(cards(page).nth(0)).toHaveCSS('transition-duration', '0.12s');
  await page.getByRole('button', { name: 'Resume' }).click();
  await cards(page).nth(8).click(); await cards(page).nth(15).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await expect.poll(() => page.locator('.win-banner').evaluate((element) => element.getAnimations().length)).toBe(0);
  await expect(page.locator('.win-banner')).toHaveCSS('box-shadow', 'none');
  await expect(cards(page).nth(0)).toHaveCSS('opacity', '1');
  await expect(cards(page).nth(0)).toHaveCSS('border-color', 'rgb(139, 234, 125)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadSnapshot(page, progress()); await page.getByRole('button', { name: 'Resume' }).click();
  await cards(page).nth(8).click(); await cards(page).nth(15).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(cards(page).nth(0)).toHaveCSS('transition-duration', '0s');
});
