import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';

export async function freezeTime(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T00:00:01Z'));
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  if (!await page.locator('details').evaluate(element => element.hasAttribute('open'))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(code);
}

export async function loadSnapshot(page: Page, data: unknown): Promise<void> {
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(data));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export function pairsFor(code: string): [number, number][] {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test board');
  return Array.from({ length: game.deck.length / 2 }, (_, face) =>
    [game.deck.indexOf(face), game.deck.lastIndexOf(face)]);
}

export async function finish(page: Page, code = 'np1-4-1', keyboard = false): Promise<void> {
  for (const [first, second] of pairsFor(code)) {
    for (const index of [first, second]) {
      const card = page.locator('.card').nth(index);
      if (keyboard) await card.press('Enter'); else await card.click();
    }
  }
}

export async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

export async function touchScrollToEnd(page: Page): Promise<void> {
  const area = page.locator('.board-scroll');
  await area.scrollIntoViewIfNeeded();
  const box = await area.boundingBox();
  if (!box) throw new Error('Missing board scroll area');
  const cdp = await page.context().newCDPSession(page);
  for (const axis of ['x', 'y'] as const) {
    const distance = (axis === 'x' ? box.width : box.height) - 64;
    const limits = await area.evaluate(element => ({
      x: element.scrollWidth - element.clientWidth, y: element.scrollHeight - element.clientHeight,
    }));
    for (let attempt = 0; attempt < Math.ceil(limits[axis] / (distance - 32)) + 1; attempt++) {
      const position = await area.evaluate((element, direction) =>
        direction === 'x' ? element.scrollLeft : element.scrollTop, axis);
      if (position >= limits[axis] - 1) break;
      const x = box.x + (axis === 'x' ? box.width - 32 : box.width / 2);
      const y = box.y + (axis === 'y' ? box.height - 32 : box.height / 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 6; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: x - (axis === 'x' ? distance * step / 6 : 0),
          y: y - (axis === 'y' ? distance * step / 6 : 0),
        }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  }
  await cdp.detach();
  await expect.poll(() => area.evaluate(element => ({
    remainingX: Math.round(element.scrollWidth - element.clientWidth - element.scrollLeft),
    remainingY: Math.round(element.scrollHeight - element.clientHeight - element.scrollTop),
  }))).toEqual({ remainingX: 0, remainingY: 0 });
}

export const pendingSnapshot = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
