import { expect, test, TestTimeouts } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { enterTournament, playTournamentTurn, tournamentJSON } from './tournament-fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';

for (const count of [4, 8])
  test(
    `${count} players finish a knockout on shared deals and history survives reload`,
    async ({ page, gameURL }) => {
      await page.goto(gameURL);
      await page.evaluate(() =>
        localStorage.setItem(
          'neon-pairs.preferences.v1',
          JSON.stringify({
            schemaVersion: 1,
            size: 10,
            bestMoves: { '4': 12, '6': 25, '8': 40 },
          }),
        ),
      );
      await loadTimedBoard(page, gameURL);
      const preferences = await page.evaluate(() =>
        localStorage.getItem('neon-pairs.preferences.v1'),
      );
      await enterTournament(page, count);
      const opening =
        count === 4
          ? ['Ada', 'Dev', 'Bo', 'Cora']
          : ['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia'];
      const codes = new Set<string>();
      for (let match = 0; match < count - 1; match += 1) {
        const expectedSize = count === 8 && match < 4 ? 4 : match < count - 2 ? 6 : 8;
        await expect(
          page.getByText(
            `Round: ${expectedSize === 4 ? 'Quarterfinal' : expectedSize === 6 ? 'Semifinal' : 'Final'}`,
            { exact: true },
          ),
        ).toBeVisible();
        for (let player = 0; player < 2; player += 1) {
          if (match < count / 2)
            await expect(
              page
                .getByText(`Now playing: ${opening[match * 2 + player]}`, { exact: true })
                .first(),
            ).toBeVisible();
          await expect(page.locator('.card')).toHaveCount(0);
          const code = await playTournamentTurn(page, count === 4 && match === 0 && player === 0);
          expect(Number(code.split('-')[1])).toBe(expectedSize);
          if (player === 0) {
            expect(codes.has(code)).toBe(false);
            codes.add(code);
          } else expect(codes.has(code)).toBe(true);
          if (player === 0)
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        }
        if (match < count - 2)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      const champion = count === 4 ? 'Bo' : 'Ada';
      await expect(page.getByText(`Champion: ${champion}`, { exact: true })).toBeVisible();
      await expect(page.locator('.victory')).toBeVisible();
      await expect(page.locator('.victory')).toHaveClass(/celebrate/);
      await expect(page.getByRole('status')).toContainText(`Champion: ${champion}.`);
      await expect(
        page.getByRole('heading', { name: 'Tournament complete', exact: true }),
      ).toBeFocused();
      expect(codes.size).toBe(count - 1);
      await expect(page.locator('table caption')).toHaveText('Tournament bracket');
      await expect(page.locator('th[scope="col"]')).toHaveCount(6);
      await expect(page.getByText('(winner)', { exact: false }).first()).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
        preferences,
      );
      const completed = await tournamentJSON(page);
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Past tournaments', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: `Tournament 1: Champion: ${champion}`, exact: true })
        .click();
      await expect(page.getByText(`Champion: ${champion}`, { exact: true })).toBeVisible();
      await expect(page.locator('.victory')).toBeVisible();
      await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
      expect(await tournamentJSON(page)).toEqual(completed);
      const raw = await page.evaluate(() => localStorage.getItem('np3:tournaments'));
      const value: unknown = JSON.parse(raw ?? 'null');
      expect(
        isJsonObject(value) &&
          value.v === 3 &&
          Array.isArray(value.items) &&
          value.items.length === 1,
      ).toBe(true);
    },
    {},
    undefined,
    TestTimeouts.long,
  );

test('names, JSON loading, handoff focus and leave confirmation preserve unfinished play', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByText('Use 2 to 20 characters.', { exact: true }).first()).toBeVisible();
  const names = [' Ada ', 'Bo', 'Cora', ' ADA '];
  for (const [index, name] of names.entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(
    page.getByText('Each name must be different.', { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel('Player 4', { exact: true }).fill('Dev');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await page.clock.runFor(123);
  const before = await tournamentJSON(page);
  const draft = page.getByLabel('Tournament JSON', { exact: true });
  const json = await draft.inputValue();
  const invalid = json.slice(0, -1) + ',"surprise":true}';
  await draft.fill(invalid);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: surprise.');
  await expect(draft).toHaveValue(invalid);
  expect(await tournamentJSON(page)).toEqual(before);
  await draft.fill(json);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  expect((await tournamentJSON(page)).game).toEqual(before.game);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText('No finished tournaments yet.', { exact: true })).toBeVisible();
});
