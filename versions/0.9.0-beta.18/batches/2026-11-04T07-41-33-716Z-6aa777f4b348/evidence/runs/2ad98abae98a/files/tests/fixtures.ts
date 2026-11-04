import { mkdir, writeFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { createGame } from '../src/game/deal.ts';

export const literalDeck = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const cards = (page: Page) => page.getByRole('group', { name: 'Card board' }).getByRole('button');
export async function openTools(page: Page) {
  const details = page.locator('details');
  if (!(await details.evaluate(node => node.hasAttribute('open')))) await page.getByText('Reproduce a game', { exact: true }).click();
}
export async function loadCode(page: Page, code = 'np1-4-1') {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}
export async function loadSnapshot(page: Page, snapshot: unknown) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function exported(page: Page): Promise<Record<string, unknown>> {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const value: unknown = JSON.parse(await page.getByLabel('Snapshot JSON').inputValue());
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid export');
  return Object.fromEntries(Object.entries(value));
}
export async function finish(page: Page, code = 'np1-4-1') {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test deal');
  for (let face = 0; face < game.deck.length / 2; face++) {
    for (const [index, value] of game.deck.entries()) {
      if (value === face) await cards(page).nth(index).click();
    }
  }
  await expect(page.locator('.win-banner')).toBeVisible();
}
export function nearWin(moves = 7, complete = false) {
  return { version: 1, boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, i) => i).filter(i => complete || (i !== 0 && i !== 11)),
    selection: { kind: 'closed' }, moves, elapsedMs: 3600000, started: true };
}
export async function evidence(info: TestInfo, name: string, body: string | Buffer, contentType: string) {
  await mkdir('evidence', { recursive: true });
  const path = `evidence/${name}`;
  await writeFile(path, typeof body === 'string' ? `${body}\n` : body);
  await info.attach(name, { path, contentType });
}
export async function touchScrollBoard(page: Page, end: boolean) {
  const area = page.locator('.board-scroll');
  await area.scrollIntoViewIfNeeded();
  const client = await page.context().newCDPSession(page);
  try {
    for (const horizontal of [true, false]) {
      for (let swipe = 0; swipe < 6; swipe++) {
        const remaining = await area.evaluate((node, { horizontal, end }) => {
          const current = horizontal ? node.scrollLeft : node.scrollTop;
          const max = horizontal ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight;
          return end ? max - current : current;
        }, { horizontal, end });
        if (remaining < 1) break;
        const box = await area.boundingBox();
        if (!box) throw new Error('Missing touch target');
        const length = (horizontal ? box.width : box.height) - 48;
        const start = end ? length + 24 : 24;
        const point = (step: number) => ({
          x: box.x + (horizontal ? start + (end ? -1 : 1) * length * step / 12 : box.width / 2),
          y: box.y + (horizontal ? box.height / 2 : start + (end ? -1 : 1) * length * step / 12),
        });
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(0)] });
        for (let step = 1; step <= 12; step++) {
          await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(step)] });
          await page.waitForTimeout(16);
        }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(120);
      }
    }
  } finally { await client.detach(); }
}
