import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { DEFAULT_SIZE, PREFERENCES_KEY, PREFERENCES_VERSION } from '../src/game/session/storage.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { StatusLabel } from '../src/game/status/status-labels.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import type { Page } from '@playwright/test';

const PERFECT = EXAMPLE_PAIRS.length;

function shownBest(page: Page) {
  return page
    .locator('.stats > div')
    .filter({ has: page.getByText(StatusLabel.best, { exact: true }) })
    .locator('dd');
}

// Stores a best as an earlier visit would have saved it.
async function saveBest(page: Page, moves: number): Promise<void> {
  const saved = JSON.stringify({
    schemaVersion: PREFERENCES_VERSION,
    size: DEFAULT_SIZE,
    bestMoves: { [DEFAULT_SIZE]: moves },
  });
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    PREFERENCES_KEY,
    saved,
  ] as const);
}

function savedBest(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
}

for (const saved of [PERFECT, PERFECT + 1, PERFECT + 2])
  test(`a resumed ${PERFECT + 1}-move win preserves the best of ${saved} when appropriate`, async ({
    page,
    gameURL,
  }) => {
    await page.goto(gameURL);
    await saveBest(page, saved);
    await page.reload();
    const pending = {
      version: SNAPSHOT_VERSION,
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      selection: { kind: SelectionKind.closed },
      moves: PERFECT,
      elapsedMs: 0,
      started: true,
    };
    await page.locator('summary').click();
    await page
      .getByLabel(ReproductionControl.snapshot, { exact: true })
      .fill(JSON.stringify(pending));
    await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
    await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
    for (const index of EXAMPLE_PAIRS.slice(-1).flat())
      await page.locator('.card').nth(index).click();
    const expected = String(Math.min(saved, PERFECT + 1));
    await expect(shownBest(page)).toHaveText(expected);
    await page.reload();
    await expect(shownBest(page)).toHaveText(expected);
    await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
    await expect(shownBest(page)).toHaveText('none');
  });

// A worse completed import is the case only a browser can show: the saved best and its label stay as they were.
for (const [saved, imported] of [[PERFECT, PERFECT + 2]] as const)
  test(`a completed import in ${imported} moves leaves a saved best of ${saved} alone`, async ({
    page,
    gameURL,
  }) => {
    await page.goto(gameURL);
    await saveBest(page, saved);
    await page.reload();
    const best = shownBest(page);
    await expect(best).toHaveText(String(saved));
    const before = await savedBest(page);
    await best.evaluate((element) => {
      const changes: string[] = [];
      element.setAttribute('data-changes', '[]');
      new MutationObserver(() => {
        changes.push(element.textContent ?? '');
        element.setAttribute('data-changes', JSON.stringify(changes));
      }).observe(element, { childList: true, characterData: true, subtree: true });
    });
    const completed = {
      version: SNAPSHOT_VERSION,
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: SelectionKind.closed },
      moves: imported,
      elapsedMs: 0,
      started: true,
    };
    await page.locator('summary').click();
    await page
      .getByLabel(ReproductionControl.snapshot, { exact: true })
      .fill(JSON.stringify(completed));
    await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
    await expect(page.locator('.card.matched')).toHaveCount(PERFECT * 2);
    const changes: unknown = JSON.parse((await best.getAttribute('data-changes')) ?? '[]');
    expect(changes, 'C12 import leaves the shown best alone').toEqual([]);
    expect(await savedBest(page), 'C12 import leaves the saved best alone').toBe(before);
  });
