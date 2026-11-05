import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/format.ts';
import { expect, test, TestTimeouts } from './browser-test.ts';
import { GAME_URL } from './game-fixture.ts';
import { assertTargetSizes, finishTurn, matchCode } from './tournament-helpers.ts';

const SAVED_PREFERENCES = JSON.stringify({
  schemaVersion: 1,
  size: 10,
  bestMoves: { '4': 8 },
});

test(
  'four-player tournament reuses each match deal and saves its finished bracket',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: PREFERENCES_KEY,
      value: SAVED_PREFERENCES,
    });
    await page.goto(gameURL || GAME_URL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
    await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Winner', exact: true })).toBeVisible();

    const firstCode = await matchCode(page, 0);
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await expect(page.locator('.card')).toHaveCount(36);
    await finishTurn(page, firstCode);
    await page.getByRole('button', { name: 'Next turn', exact: true }).click();
    await expect(page.getByText('Now playing: Dev', { exact: true })).toBeVisible();
    expect(await matchCode(page, 0)).toBe(firstCode);
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await expect(page.locator('.card')).toHaveCount(36);
    await finishTurn(page, firstCode);
    await page.getByRole('button', { name: 'Next match', exact: true }).click();

    const secondCode = await matchCode(page, 1);
    expect(secondCode).not.toBe(firstCode);
    await expect(page.getByText('Now playing: Bo', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await finishTurn(page, secondCode);
    await page.getByRole('button', { name: 'Next turn', exact: true }).click();
    await expect(page.getByText('Now playing: Cora', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await finishTurn(page, secondCode);
    await page.getByRole('button', { name: 'Next match', exact: true }).click();

    const finalCode = await matchCode(page, 2);
    expect(finalCode).not.toBe(firstCode);
    expect(finalCode).not.toBe(secondCode);
    await expect(page.getByText('Round: Final', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await expect(page.locator('.card')).toHaveCount(64);
    await finishTurn(page, finalCode);
    await page.getByRole('button', { name: 'Next turn', exact: true }).click();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await finishTurn(page, finalCode);
    await expect(page.getByRole('heading', { name: 'Champion: Ada', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to game', exact: true })).toBeVisible();

    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
      SAVED_PREFERENCES,
    );
    const history = await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY);
    expect(history).not.toBeNull();
    expect(JSON.parse(history ?? '{}').items).toHaveLength(1);
    await page.reload();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Past tournaments', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.past-tournament-list summary')).toContainText('Champion: Ada');
    await assertTargetSizes(page, '.past-tournament-list summary');
    await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
    const exported = JSON.parse(
      await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).inputValue(),
    );
    expect(exported.data.phase).toBe('finished');
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Champion: Ada', exact: true })).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('eight-player setup seeds the documented opening match and Leave tournament returns to play', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await assertTargetSizes(page, '.tournament-screen .control');
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (let index = 0; index < 8; index += 1)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(`P${index + 1}`);
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const draft = JSON.parse(
    await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).inputValue(),
  );
  expect(draft.data.kind).toBe('setup');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const exported = JSON.parse(
    await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).inputValue(),
  );
  expect(exported.data.matches[0].playerSeeds).toEqual([1, 8]);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(16);
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const active = JSON.parse(
    await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).inputValue(),
  );
  expect(active.data.phase).toBe('playing');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Leave this tournament?' })
    .getByRole('button', { name: 'Leave', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).fill('{');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid tournament JSON.');
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(16);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Leave this tournament?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await assertTargetSizes(page, '.tournament-leave-dialog .control');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Leave this tournament?' })
    .getByRole('button', { name: 'Leave', exact: true })
    .click();
  await expect(page.locator('.card')).toHaveCount(16);
  await expect(page.getByRole('heading', { name: 'Play', exact: true })).toBeFocused();
  expect(await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY)).toBeNull();
});

test('tournament play continues when browser storage is unavailable', async ({ page, gameURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked.', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
});
