import assert from 'node:assert/strict';
import { expect, test, TestTimeouts } from './browser-test.ts';
import { enterTournament, finishTournamentTurn, tournamentExport } from './tournament-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';
import { TournamentPhase } from '../src/game/tournament/rules.ts';

for (const count of [4, 8])
  test(
    `${count} players complete a seeded tournament and reload its history`,
    async ({ page, gameURL }, artifacts) => {
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(60_000);
      await page.goto(gameURL);
      const preferences = { schemaVersion: 1, size: 10, bestMoves: { '4': 9, '6': 19, '8': 33 } };
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
        key: PREFERENCES_KEY,
        value: preferences,
      });
      await page.reload();
      await enterTournament(page, count);
      const opening = await tournamentExport(page);
      assert.equal(opening.state.players.length, count);
      const codes: string[] = [];
      for (let index = 0; index < count - 1; index += 1) {
        await expect(page.getByRole('status')).toContainText('Now playing:');
        const first = await finishTournamentTurn(page);
        await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        assert.equal(await finishTournamentTurn(page), first);
        codes.push(first);
        if (index < count - 2) {
          await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
        }
      }
      assert.equal(new Set(codes).size, count - 1);
      await expect(page.locator('.tournament-champion')).toHaveText('Champion: Ada');
      await expect(page.getByRole('status')).toHaveText('Champion: Ada');
      await expect(page.getByRole('heading', { name: 'Tournament complete' })).toBeFocused();
      await expect(page.getByRole('table')).toHaveCount(1);
      await expect(page.locator('th[scope="col"]')).toHaveCount(5);
      await expect(page.getByRole('status')).toHaveCount(1);
      const final = await tournamentExport(page);
      assert.equal(final.state.phase, TournamentPhase.complete);
      const savedPreferences = await page.evaluate(
        (key) => localStorage.getItem(key),
        PREFERENCES_KEY,
      );
      assert.deepEqual(JSON.parse(savedPreferences ?? 'null'), preferences);
      const saved = await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY);
      assert.ok(saved);
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await page
        .getByRole('button', { name: 'View tournament 1: Champion: Ada', exact: true })
        .click();
      assert.equal((await tournamentExport(page)).text, final.text);
    },
    { viewport: { width: 390, height: 844 } },
    undefined,
    TestTimeouts.long,
  );

test(
  'name validation, native leave confirmation and phone target sizes follow the project policies',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.locator('#name-error')).toHaveText('Use 2 to 20 characters.');
    for (const [index, name] of [' Ada ', 'ADA', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.locator('#name-error')).toHaveText('Each name must be different.');
    await page.getByLabel('Player 2', { exact: true }).fill('  Bo   Joy  ');
    const sizes = await page
      .locator('.tournament button, .tournament select, .tournament input, .tournament textarea')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return [box.width, box.height];
        }),
      );
    for (const [width, height] of sizes) {
      assert.ok(width && width >= 44);
      assert.ok(height && height >= 44);
    }
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    assert.deepEqual((await tournamentExport(page)).state.players, [
      'Ada',
      'Bo Joy',
      'Cora',
      'Dev',
    ]);
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  },
  { viewport: { width: 390, height: 844 } },
);

test('JSON errors preserve the active game and a loaded active turn waits for Start turn', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await enterTournament(page, 4);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').nth(0).click();
  const exported = await tournamentExport(page);
  const invalid = exported.text.replace('"version": 1', '"mystery": 1, "version": 1');
  await page.getByLabel('Tournament JSON', { exact: true }).fill(invalid);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('#tournament-load-notice')).toHaveText('Unknown field: mystery.');
  await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue(invalid);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Tournament JSON', { exact: true }).fill(exported.text);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  assert.equal((await tournamentExport(page)).state.game?.selection.kind, 'one');
});

test('blocked browser storage keeps tournaments playable and explains history persistence', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto(gameURL);
  await enterTournament(page, 4);
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await finishTournamentTurn(page);
  await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
});
