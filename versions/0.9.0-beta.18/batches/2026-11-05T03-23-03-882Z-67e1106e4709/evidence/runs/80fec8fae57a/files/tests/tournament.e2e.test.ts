import { test, expect, Scrollbars, TestTimeouts } from './browser-test.ts';
import {
  enterTournament,
  exportedTournament,
  finishTournamentBoard,
} from './tournament-fixture.ts';

test(
  'four players finish a shared-deal knockout and retain the bracket after reload',
  async ({ page, gameURL }, artifacts) => {
    await page.goto(gameURL);
    await page.getByLabel('Grid size', { exact: true }).selectOption('10');
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await enterTournament(page, gameURL);
    await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);
    const codes: string[] = [];
    for (let match = 0; match < 3; match += 1) {
      for (let turn = 0; turn < 2; turn += 1) {
        const before = await exportedTournament(page);
        assert.ok(isJsonObject(before.tournament) && isJsonObject(before.tournament.game));
        codes.push(String(before.tournament.game.boardCode));
        await finishTournamentBoard(page, match === 0 && turn === 0, turn === 0 ? 1000 : 2000);
        if (turn === 0) {
          await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        } else if (match < 2) {
          await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
        }
      }
    }
    await expect(page.getByText('Champion: Player 4', { exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Tournament bracket' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      preferences,
    );
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: '4 players · Champion: Player 4', exact: true }).click();
    await expect(page.getByText('Champion: Player 4', { exact: true })).toBeVisible();
    await expect(page.locator('.tournament-bracket tbody tr')).toHaveCount(6);
    const completed = await exportedTournament(page);
    expect(completed.format).toBe('neon-pairs/tournament');
    for (let match = 0; match < 3; match += 1) expect(codes[match * 2]).toBe(codes[match * 2 + 1]);
    expect(new Set(codes).size).toBe(3);
    await page.screenshot({ path: artifacts.outputPath('finished-bracket.png'), fullPage: true });
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);

test(
  'eight players follow the opening order and complete all three board sizes',
  async ({ page, gameURL }) => {
    await enterTournament(page, gameURL, 8);
    await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
    const order = [1, 8, 4, 5, 3, 6, 2, 7, 1, 4, 3, 2, 1, 2];
    for (let match = 0; match < 7; match += 1) {
      for (let turn = 0; turn < 2; turn += 1) {
        await expect(page.locator('.tournament-player')).toHaveText(
          `Now playing: Player ${order[match * 2 + turn]}`,
        );
        await finishTournamentBoard(page);
        if (turn === 0) await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        else if (match < 6)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
    }
    await expect(page.getByText('Champion: Player 1', { exact: true })).toBeVisible();
    await expect(page.locator('.tournament-bracket tbody tr')).toHaveCount(14);
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);

test(
  'setup validates normalized names and offers JSON controls at phone size',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
    for (const [index, name] of [
      '  Cafe\u0301   Noir ',
      'Bo',
      'CAFÉ NOIR',
      '😀'.repeat(20),
    ].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Each name must be different.');
    await page.getByLabel('Player 3', { exact: true }).fill('Cora');
    await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('Café Noir');
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.locator('.tournament-player')).toHaveText('Now playing: Café Noir');
    const targets = await page.locator('.control').evaluateAll((controls) =>
      controls.map((control) => {
        const { width, height } = control.getBoundingClientRect();
        return { width, height };
      }),
    );
    for (const target of targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page
        .locator('.tournament-bracket th')
        .first()
        .evaluate((cell) => cell.getBoundingClientRect().height),
    ).toBeLessThan(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  },
  { viewport: { width: 390, height: 844 } },
);
import assert from 'node:assert/strict';
import { isJsonObject } from '../src/game/saved-format.ts';
