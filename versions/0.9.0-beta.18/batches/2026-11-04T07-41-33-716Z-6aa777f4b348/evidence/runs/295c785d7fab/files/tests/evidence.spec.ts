import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame } from '../src/game/state.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import { FOUR_PAIRS, freezeTime, loadBoard, loadSnapshot } from './helpers.ts';

test('records a complete keyboard accessibility-tree journey', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  await page.locator('summary').click();
  await freezeTime(page);
  const evidence = [`Neon Pairs spec 2.2; Playwright 1.64.1; Chromium ${browser.version()}.`,
    'Automated accessibility-tree evidence. No screen reader was used; spoken output requires user acceptance.'];
  const capture = async (stage: string) => evidence.push(`\n${stage}\n${await page.locator('main').ariaSnapshot()}`);
  await capture('Initial closed board and named controls');
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.card').first()).toBeFocused();
  let focused = 0;
  async function moveTo(index: number): Promise<void> {
    while (focused % 4 < index % 4) { await page.keyboard.press('ArrowRight'); focused++; }
    while (focused % 4 > index % 4) { await page.keyboard.press('ArrowLeft'); focused--; }
    while (Math.floor(focused / 4) < Math.floor(index / 4)) { await page.keyboard.press('ArrowDown'); focused += 4; }
    while (Math.floor(focused / 4) > Math.floor(index / 4)) { await page.keyboard.press('ArrowUp'); focused -= 4; }
  }
  await page.keyboard.press('Enter');
  await capture('First revealed face with its position and state');
  await moveTo(1);
  await page.keyboard.press('Space');
  await capture('First mismatch and polite result');
  await page.clock.runFor(800);
  await moveTo(0);
  await page.keyboard.press('Enter');
  await moveTo(1);
  await page.keyboard.press('Space');
  await capture('Consecutive identical mismatch; a new live-region child was mounted');
  await page.clock.runFor(800);
  for (const [first, second] of FOUR_PAIRS) {
    await moveTo(first);
    await page.keyboard.press('Enter');
    await moveTo(second);
    await page.keyboard.press('Space');
  }
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. All pairs found in 10 moves and 0:01.');
  await capture('Completed keyboard game: all matched names, final moves, time and single win announcement');
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await capture('Native Tab exit and new game by keyboard; action keeps focus');
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-accessibility.txt', evidence.join('\n'));
});

test('renders an ordered 44px grayscale sheet of all 128 shipped faces', async ({ page }) => {
  const state = createGame('np1-16-1');
  if (!state) throw new Error('Invalid face-sheet board.');
  await page.goto('/');
  await loadSnapshot(page, encodeSnapshot({ ...state, matched: state.deck.map((_, index) => index), moves: 128, started: true }));
  const svgs = await page.locator('.card').evaluateAll(cards => cards.map(card => card.querySelector('svg')?.outerHTML ?? ''));
  const figures: string[] = [];
  for (let id = 0; id < 128; id++) {
    const svg = svgs[state.deck.indexOf(id)];
    if (!svg) throw new Error(`Missing face ${id}.`);
    figures.push(`<figure><div>${svg}</div><figcaption>${id}</figcaption></figure>`);
  }
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs grayscale face sheet</title>
    <style>body{margin:16px;background:#090B14;color:#F4F6FF;font:14px/24px system-ui}h1{font-size:24px}
    main{display:grid;grid-template-columns:repeat(16,44px);gap:12px}figure{margin:0}figure div{width:44px;height:44px;
    background:#111625;filter:grayscale(1)}svg{width:44px;height:44px;display:block}figcaption{text-align:center}</style>
    <h1>Neon Pairs — all 128 identities at 44px</h1><p>Rows 0–63: solid. Rows 64–127: outline. Marker directions advance every eight faces.</p>
    <main>${figures.join('')}</main></html>`;
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/faces-grayscale.html', html);
  await page.setViewportSize({ width: 960, height: 800 });
  await page.setContent(html);
  await expect(page.locator('figure')).toHaveCount(128);
  const markerStrokes = await page.locator('svg > circle').evaluateAll(markers => markers.map(marker => marker.getAttribute('stroke-width')));
  expect(markerStrokes.every(stroke => stroke === '3')).toBe(true);
  await page.screenshot({ path: 'evidence/faces-grayscale.png', fullPage: true });
});
