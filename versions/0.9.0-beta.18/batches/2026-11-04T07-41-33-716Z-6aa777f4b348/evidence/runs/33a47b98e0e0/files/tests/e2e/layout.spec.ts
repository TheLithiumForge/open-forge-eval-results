import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { boardFor, cardAt, finishByPointer, keyboardMoveTo, loadBoard, pairPositions, snapshotFor } from './helpers.ts';
import { describeFace } from '../../src/game/board/face.ts';

test('16x16 stays inside its board scroller at phone and desktop sizes', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 1_280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Grid size').selectOption('16');
    await expect(page.locator('.game-card')).toHaveCount(256);
    const metrics = await page.evaluate(() => {
      const scroll = document.querySelector('.board-scroll');
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.game-card'));
      if (scroll === null) throw new Error('Board scroll area is missing');
      const widths = cards.map((card) => card.getBoundingClientRect().width);
      return {
        outerWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        clientWidth: scroll.clientWidth,
        scrollWidth: scroll.scrollWidth,
        scrollHeight: scroll.scrollHeight,
        boardHeight: scroll.getBoundingClientRect().height,
        maxBoardHeight: Math.min(innerHeight * 0.7, 768),
        minCard: Math.min(...widths),
        maxCard: Math.max(...widths),
      };
    });
    expect(metrics.outerWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.boardHeight).toBeLessThanOrEqual(metrics.maxBoardHeight + 1);
    expect(metrics.minCard).toBeGreaterThanOrEqual(44);
    expect(metrics.maxCard).toBeLessThanOrEqual(88);
    if (viewport.width === 360) expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.boardHeight);

    await page.getByLabel('Grid size').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(cardAt(page, 0)).toBeFocused();
    await keyboardMoveTo(page, 0, 255, 16);
    await expect(cardAt(page, 255)).toBeFocused();
    const outline = await cardAt(page, 255).evaluate((card) => {
      const rect = card.getBoundingClientRect();
      const board = card.closest('.board-scroll')?.getBoundingClientRect();
      if (board === undefined) return null;
      return {
        full: rect.left - 5 >= board.left && rect.top - 5 >= board.top && rect.right + 5 <= board.right && rect.bottom + 5 <= board.bottom,
        width: getComputedStyle(card).outlineWidth,
        offset: getComputedStyle(card).outlineOffset,
      };
    });
    expect(outline).toEqual({ full: true, width: '3px', offset: '2px' });
  }
});

test('640x400 at device scale 2 keeps four and sixteen column boards playable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await loadBoard(page, 'np1-4-1');
    const first = pairPositions(boardFor('np1-4-1'))[0];
    if (first === undefined || first[0] === undefined || first[1] === undefined) throw new Error('Pair fixture missing');
    await cardAt(page, first[0]).click();
    await cardAt(page, first[1]).click();
    await expect(page.locator('.status-readout')).toContainText('Pairs: 1/8');
    await page.getByLabel('Grid size').selectOption('16');
    await expect(page.locator('.game-card')).toHaveCount(256);
    const metrics = await page.evaluate(() => ({
      outerWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      card: document.querySelector('.game-card')?.getBoundingClientRect().width ?? 0,
      controls: document.querySelector('.deal-controls')?.getBoundingClientRect(),
      status: document.querySelector('.status-readout')?.getBoundingClientRect(),
    }));
    expect(metrics.outerWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.card).toBeGreaterThanOrEqual(44);
    expect(metrics.controls).toBeDefined();
    expect(metrics.status).toBeDefined();
    if (metrics.controls === undefined || metrics.status === undefined) throw new Error('Layout readout is missing');
    expect(metrics.status.top).toBeGreaterThanOrEqual(metrics.controls.bottom);

    await cardAt(page, 0).focus();
    await keyboardMoveTo(page, 0, 255, 16);
    await cardAt(page, 255).click();
    await expect(cardAt(page, 255)).toHaveAttribute('aria-label', /revealed$/);
    await expect(page.locator('.screen-reader-output')).toBeAttached();
  } finally {
    await context.close();
  }
});

test('reduced motion removes card transitions and keeps imported wins static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const before = await cardAt(page, 0).evaluate((card) => getComputedStyle(card).transitionDuration);
  expect(before).toBe('0s');
  const completed = snapshotFor('np1-4-1', 8, { kind: 'closed' }, 2_000);
  await page.locator('.reproduction-panel summary').click();
  await page.getByLabel('Snapshot JSON').fill(completed);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/is-celebrating/);
  expect(await page.locator('.win-banner').evaluate((banner) => getComputedStyle(banner).animationName)).toBe('none');
});

test('played completion runs one 600ms pulse, then leaves the banner static', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  await finishByPointer(page, 'np1-4-1');
  const banner = page.locator('.win-banner');
  await expect(banner).toHaveClass(/is-celebrating/);
  const motion = await banner.evaluate((element) => ({
    name: getComputedStyle(element).animationName,
    duration: getComputedStyle(element).animationDuration,
    iteration: getComputedStyle(element).animationIterationCount,
  }));
  expect(motion).toEqual({ name: 'win-pulse', duration: '0.6s', iteration: '1' });
  await page.clock.runFor(599);
  await expect(banner).toHaveClass(/is-celebrating/);
  await page.clock.runFor(1);
  await expect(banner).not.toHaveClass(/is-celebrating/);
});

test('captures all 128 actual SVG faces at 44px in a grayscale review sheet', async ({ page }) => {
  await page.goto('/');
  const game = boardFor('np1-16-1');
  await page.locator('.reproduction-panel summary').click();
  await page.getByLabel('Snapshot JSON').fill(snapshotFor('np1-16-1', 128, { kind: 'closed' }, 1_000));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  const faces = await page.locator('.game-card').evaluateAll((cards) => {
    const seen = new Set<string>();
    const entries: Array<{ name: string; svg: string }> = [];
    for (const card of cards) {
      const label = card.getAttribute('aria-label') ?? '';
      const name = label.replace(/^Row \d+, column \d+, /, '').replace(/, matched$/, '');
      if (name === '' || seen.has(name)) continue;
      const svg = card.querySelector('svg.face-artwork');
      if (svg === null) throw new Error('Revealed face has no inline SVG');
      seen.add(name);
      entries.push({ name, svg: svg.outerHTML });
    }
    return entries;
  });
  expect(faces).toHaveLength(128);
  expect(new Set(faces.map((face) => face.svg)).size).toBe(128);
  expect(faces.map((face) => face.name).sort()).toEqual(
    Array.from({ length: 128 }, (_unused, id) => describeFace(id).name).sort(),
  );

  const svgByName = new Map(faces.map((face) => [face.name, face.svg]));
  const tiles = Array.from({ length: 128 }, (_unused, id) => {
    const face = describeFace(id);
    const svg = svgByName.get(face.name);
    if (svg === undefined) throw new Error('Face identity mapping is missing');
    return `<div class="tile" title="${id}: ${face.name}" aria-label="${id}: ${face.name}"><div class="face">${svg}</div><span>${String(id).padStart(3, '0')}</span></div>`;
  });
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neon Pairs grayscale face sheet</title><style>body{margin:16px;background:#090b14;color:#f4f6ff;font:12px system-ui,sans-serif}.sheet{display:grid;grid-template-columns:repeat(16,44px);gap:12px 8px}.tile{width:44px;display:grid;gap:4px;text-align:center}.face{width:44px;height:44px;box-sizing:border-box;border:2px solid #757c9a;border-radius:8px;background:#111625;filter:grayscale(1)}svg{width:100%;height:100%}span{width:44px;line-height:12px;color:#b8bdd2}</style><h1>Neon Pairs · 128 grayscale faces at 44px</h1><div class="sheet">${tiles.join('')}</div></html>`;
  await page.setContent(html);
  await expect(page.locator('.tile')).toHaveCount(128);
  await mkdir(resolve('evidence/faces'), { recursive: true });
  await writeFile(resolve('evidence/faces/facesheet.html'), html, 'utf8');
  await page.screenshot({ path: resolve('evidence/faces/facesheet.png'), fullPage: true });
});
