import { expect } from './browser-test.ts';
import type { Page } from '@playwright/test';

export async function finishTournamentBoard(page: Page): Promise<void> {
  const cards = page.locator('.tournament-current .card');
  const count = await cards.count();
  const unseen = new Set(Array.from({ length: count }, (_, index) => index));
  const known = new Map<string, number[]>();
  const matched = new Set<number>();

  async function faceAt(index: number): Promise<string> {
    const label = await cards.nth(index).getAttribute('aria-label');
    const face = label?.match(/^Row \d+, column \d+, (?:revealed|matched), (.+)$/)?.[1];
    if (!face) throw new Error(`Expected revealed face at ${index}; got ${label}.`);
    return face;
  }

  async function match(first: number, second: number): Promise<void> {
    await cards.nth(first).click();
    await cards.nth(second).click();
    await expect(cards.nth(first)).toHaveClass(/matched/);
    matched.add(first);
    matched.add(second);
  }

  while (matched.size < count) {
    if (unseen.size === 0) {
      const pair = [...known.entries()].find(([, positions]) => positions.length === 2);
      if (!pair) throw new Error('Expected the remembered faces to contain a pair.');
      const first = pair[1][0];
      const second = pair[1][1];
      if (first === undefined || second === undefined)
        throw new Error('Missing remembered position.');
      await match(first, second);
      known.delete(pair[0]);
      continue;
    }

    const first = unseen.values().next().value;
    if (first === undefined) throw new Error('Expected an unrevealed card.');
    unseen.delete(first);
    await cards.nth(first).click();
    const firstFace = await faceAt(first);
    const remembered = known.get(firstFace)?.find((position) => position !== first);
    if (remembered !== undefined) {
      await cards.nth(remembered).click();
      await expect(cards.nth(first)).toHaveClass(/matched/);
      matched.add(first);
      matched.add(remembered);
      known.delete(firstFace);
      continue;
    }

    const second = unseen.values().next().value;
    if (second === undefined) throw new Error('Expected a second unrevealed card.');
    unseen.delete(second);
    await cards.nth(second).click();
    const secondFace = await faceAt(second);
    if (firstFace === secondFace) {
      await expect(cards.nth(first)).toHaveClass(/matched/);
      matched.add(first);
      matched.add(second);
    } else {
      known.set(firstFace, [...(known.get(firstFace) ?? []), first]);
      known.set(secondFace, [...(known.get(secondFace) ?? []), second]);
      await page.clock.runFor(800);
    }
  }
  await expect(page.locator('.tournament-current .card.matched')).toHaveCount(count);
}
