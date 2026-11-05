import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { finishBoard, loadFixedBoard, PHONE } from './game-fixture.ts';
import { offScale } from './spacing-audit.ts';

const PAUSED = {
  version: SNAPSHOT_VERSION,
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 0 },
  moves: 0,
  elapsedMs: 1,
  started: true,
};

for (const viewport of [PHONE, { width: 1280, height: 800 }])
  test(`every margin, padding and gap stays on the spacing scale at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadFixedBoard(page);
    await finishBoard(page);
    await page.locator('summary').click();
    expect(await offScale(page), 'V09 won game with the reproduction panel open').toEqual([]);
    await page
      .getByLabel(ReproductionControl.snapshot, { exact: true })
      .fill(JSON.stringify(PAUSED));
    await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
    await expect(page.getByRole('button', { name: ReproductionControl.resume })).toBeVisible();
    expect(await offScale(page), 'V09 paused import with Resume and its notice').toEqual([]);
  });
