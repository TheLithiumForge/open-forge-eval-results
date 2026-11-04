import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/createGame.ts';
import { cards, freezeClock, loadSnapshot, snapshot } from './gameFixtures.ts';

test('all 128 SVG identities retain distinct geometry at 44px in grayscale', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/');
  await loadSnapshot(page, snapshot(16));
  const game = createGame('np1-16-1');
  if (!game) throw new Error('Invalid fixture board.');
  const positions = Array.from({ length: 128 }, (_, face) => game.deck.indexOf(face));
  await page.evaluate(indices => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.board-grid button');
    const sheet = document.createElement('div');
    sheet.id = 'face-sheet';
    Object.assign(sheet.style, { display: 'grid', gridTemplateColumns: 'repeat(16, 44px)',
      gap: '6px', padding: '6px', width: '806px', filter: 'grayscale(1)', background: '#090B14' });
    for (const index of indices) {
      const clone = buttons[index]?.cloneNode(true);
      if (!(clone instanceof HTMLButtonElement)) throw new Error('Missing face.');
      clone.querySelector('.card-check')?.remove();
      Object.assign(clone.style, { width: '44px', height: '44px', borderColor: '#757C9A' });
      sheet.append(clone);
    }
    document.body.replaceChildren(sheet);
  }, positions);
  const geometry = await page.locator('.card-face').evaluateAll(elements => elements.map(svg => {
    const shape = svg.firstElementChild;
    const marker = svg.lastElementChild;
    if (!(shape instanceof SVGGraphicsElement) || !(marker instanceof SVGCircleElement)) throw new Error('Missing geometry.');
    const bounds = shape.getBBox();
    return { viewBox: svg.getAttribute('viewBox'), x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
      radius: marker.r.baseVal.value, distance: Math.hypot(marker.cx.baseVal.value - 50, marker.cy.baseVal.value - 50),
      markerStroke: marker.getAttribute('stroke'), markerWidth: marker.getAttribute('stroke-width'),
      fill: shape.getAttribute('fill'), shapeStroke: shape.getAttribute('stroke-width'),
      signature: `${shape.outerHTML}|${marker.cx.baseVal.value}|${marker.cy.baseVal.value}` };
  }));
  expect(geometry).toHaveLength(128);
  expect(new Set(geometry.map(face => face.signature)).size).toBe(128);
  for (const [id, face] of geometry.entries()) {
    expect(face.viewBox).toBe('0 0 100 100');
    expect(face.x).toBeGreaterThanOrEqual(24.99);
    expect(face.y).toBeGreaterThanOrEqual(24.99);
    expect(face.x + face.width).toBeLessThanOrEqual(75.01);
    expect(face.y + face.height).toBeLessThanOrEqual(75.01);
    expect(face.radius).toBe(5);
    expect(face.distance).toBeCloseTo(40, 4);
    expect(face.markerStroke).toBe('#111625');
    expect(face.markerWidth).toBe('3');
    if (id >= 64) { expect(face.fill).toBe('none'); expect(face.shapeStroke).toBe('5'); }
  }
  await mkdir('evidence', { recursive: true });
  await page.locator('#face-sheet').screenshot({ path: 'evidence/faces-grayscale-44.png' });
});

for (const reduced of [false, true]) {
  test(`completion pulse and borders respect reduced motion ${reduced}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await freezeClock(page);
    await page.goto('/');
    await loadSnapshot(page, { ...snapshot(), matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11), moves: 7 });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(cards(page).nth(0)).toHaveCSS('transition-duration', reduced ? '0s' : '0.12s');
    await cards(page).nth(0).click();
    await cards(page).nth(11).click();
    await expect(page.locator('.win-banner')).toHaveCSS('animation-name', reduced ? 'none' : 'win-pulse');
    if (!reduced) {
      await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
      await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
      await expect.poll(() => page.locator('.win-banner').evaluate(element =>
        element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
    }
    await expect(page.locator('.win-banner')).toBeVisible();
  });
}
