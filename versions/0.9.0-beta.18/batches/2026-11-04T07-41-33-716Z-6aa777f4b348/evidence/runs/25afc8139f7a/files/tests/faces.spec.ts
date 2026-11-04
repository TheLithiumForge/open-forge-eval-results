import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { card, completedSnapshot, game, importSnapshot, openBoard } from './helpers.ts';

test('all 128 SVG faces satisfy the identity geometry and produce a 44px grayscale sheet', async ({ page }) => {
  await openBoard(page, 'np1-16-1');
  await importSnapshot(page, completedSnapshot('np1-16-1'));
  const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'];
  const markers = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'];
  const colors = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'];
  const palette = ['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF'];
  const state = game('np1-16-1');
  const drawings: string[] = [];
  for (let id = 0; id < 128; id++) {
    const index = state.board.deck.indexOf(id);
    const marker = Math.floor(id / 8) % 8;
    const expected = `${colors[marker]} ${id < 64 ? 'solid' : 'outline'} ${shapes[id % 8]}, marker ${markers[marker]}`;
    await expect(card(page, index)).toHaveAccessibleName(new RegExp(expected));
    const svg = card(page, index).locator('svg');
    await expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    const data = await svg.evaluate((element) => {
      const shape = element.querySelector('g');
      const marker = element.lastElementChild;
      if (!(shape instanceof SVGGElement) || !(marker instanceof SVGCircleElement)) throw new Error('Missing artwork');
      const bounds = shape.getBBox();
      return { html: element.outerHTML, fill: shape.getAttribute('fill'), stroke: shape.getAttribute('stroke'),
        strokeWidth: shape.getAttribute('stroke-width'), x: Number(marker.getAttribute('cx')), y: Number(marker.getAttribute('cy')),
        radius: marker.getAttribute('r'), markerFill: marker.getAttribute('fill'), markerStroke: marker.getAttribute('stroke'),
        markerWidth: marker.getAttribute('stroke-width'), left: bounds.x, top: bounds.y,
        right: bounds.x + bounds.width, bottom: bounds.y + bounds.height };
    });
    expect(data.left).toBeGreaterThanOrEqual(25);
    expect(data.top).toBeGreaterThanOrEqual(25);
    expect(data.right).toBeLessThanOrEqual(75);
    expect(data.bottom).toBeLessThanOrEqual(75);
    expect(Math.hypot(data.x - 50, data.y - 50)).toBeCloseTo(40, 8);
    expect(data.radius).toBe('5');
    expect(data.markerStroke).toBe('#111625');
    expect(data.markerWidth).toBe('3');
    expect(data.markerFill).toBe(palette[marker]);
    expect(data.fill).toBe(id < 64 ? palette[marker] : 'none');
    expect(data.stroke).toBe(id < 64 ? 'none' : palette[marker]);
    expect(data.strokeWidth).toBe('5');
    drawings.push(`<figure><div>${data.html}</div><figcaption>${id}</figcaption></figure>`);
  }
  await page.setViewportSize({ width: 520, height: 1200 });
  await page.setContent(`<style>body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:12px system-ui}
    main{display:grid;grid-template-columns:repeat(8,52px);gap:8px}figure{margin:0;text-align:center}
    figure div{width:44px;height:44px;background:#111625;border:2px solid #757C9A;border-radius:8px;box-sizing:border-box;filter:grayscale(1)}
    svg{width:100%;height:100%;display:block}figcaption{line-height:20px}</style>
    <p>Neon Pairs · 128 identities · 44px grayscale</p><main>${drawings.join('')}</main>`);
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/faces-grayscale.png', fullPage: true });
});
