import { expect, TestTimeouts, test } from './browser-test.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { boardPairs, finalPlayerName, matchCode, playTurn } from './tournament-play-fixture.ts';

test(
  'Tournament plays a knockout, exchanges JSON and retains the finished bracket after reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.locator('summary').click();
    const soloCode = await page.getByLabel('Board code', { exact: true }).inputValue();
    await page.locator('summary').click();
    const soloCards = page.locator('.board .card');
    for (const pair of boardPairs(soloCode)) {
      await soloCards.nth(pair.first).click();
      await soloCards.nth(pair.second).click();
    }
    await expect(page.locator('.victory')).toContainText('8 moves');
    const best = page.locator('.stats > div').filter({ hasText: 'Best:' }).locator('dd');
    await expect(best).toHaveText('8');
    await page.waitForFunction(
      () =>
        window.localStorage.getItem('neon-pairs.preferences.v1') ===
        '{"schemaVersion":1,"size":4,"bestMoves":{"4":8}}',
    );
    const soloPreferences = await page.evaluate(() =>
      window.localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    const players = page.getByLabel('Players', { exact: true });
    await players.selectOption('8');
    await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
    await players.selectOption('4');
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    const tournamentJson = page.getByRole('textbox', { name: 'Tournament JSON', exact: true });
    const exportButton = page.getByRole('button', { name: 'Export tournament', exact: true });
    await exportButton.click();
    const setupValue: unknown = JSON.parse(await tournamentJson.inputValue());
    expect(isJsonObject(setupValue) && setupValue.status).toBe('setup');
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('Ada');
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.locator('.tournament-current-player')).toHaveText('Now playing: Ada');
    const leaveTournament = page.getByRole('button', {
      name: 'Leave tournament',
      exact: true,
    });
    await leaveTournament.click();
    const leaveDialog = page.getByRole('dialog');
    await expect(leaveDialog).toBeVisible();
    const keepPlaying = leaveDialog.getByRole('button', {
      name: 'Keep playing',
      exact: true,
    });
    await expect(keepPlaying).toBeFocused();
    await keepPlaying.click();
    await expect(leaveDialog).not.toBeVisible();
    await expect(leaveTournament).toBeFocused();
    await leaveTournament.click();
    await expect(keepPlaying).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(leaveDialog).not.toBeVisible();
    await expect(leaveTournament).toBeFocused();

    await exportButton.click();
    const activeText = await tournamentJson.inputValue();
    const activeValue: unknown = JSON.parse(activeText);
    expect(isJsonObject(activeValue) && activeValue.status).toBe('active');
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.locator('.tournament-current-player')).toHaveText('Now playing: Ada');
    await tournamentJson.fill('{');
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.locator('.tournament-current-player')).toHaveText('Now playing: Ada');
    await expect(page.locator('.tournament-exchange .tournament-notice')).toHaveText(
      'Invalid tournament JSON.',
    );
    await exportButton.click();

    const firstDeal = await matchCode(page, 0, 0);
    await playTurn(page, firstDeal);
    await page.getByRole('button', { name: 'Next turn', exact: true }).click();
    await expect(page.locator('.tournament-current-player')).toHaveText('Now playing: Dev');
    expect(await matchCode(page, 0, 0)).toBe(firstDeal);
    await playTurn(page, firstDeal);
    await page.getByRole('button', { name: 'Next match', exact: true }).click();

    const secondDeal = await matchCode(page, 0, 1);
    await expect(page.locator('.tournament-current-player')).toHaveText('Now playing: Bo');
    await playTurn(page, secondDeal);
    await page.getByRole('button', { name: 'Next turn', exact: true }).click();
    await expect(page.locator('.tournament-current-player')).toHaveText('Now playing: Cora');
    expect(await matchCode(page, 0, 1)).toBe(secondDeal);
    await playTurn(page, secondDeal);
    await page.getByRole('button', { name: 'Next match', exact: true }).click();

    const finalDeal = await matchCode(page, 1, 0);
    const firstFinalist = await finalPlayerName(page, 0);
    const secondFinalist = await finalPlayerName(page, 1);
    await expect(page.locator('.tournament-current-player')).toHaveText(
      `Now playing: ${firstFinalist}`,
    );
    await playTurn(page, finalDeal);
    await page.getByRole('button', { name: 'Next turn', exact: true }).click();
    await expect(page.locator('.tournament-current-player')).toHaveText(
      `Now playing: ${secondFinalist}`,
    );
    expect(await matchCode(page, 1, 0)).toBe(finalDeal);
    await playTurn(page, finalDeal, true);

    const champion = await page.locator('.tournament-champion').textContent();
    expect(champion).toContain('Champion:');
    await exportButton.click();
    const finishedValue: unknown = JSON.parse(await tournamentJson.inputValue());
    expect(isJsonObject(finishedValue) && finishedValue.status).toBe('finished');
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.locator('.tournament-champion')).toContainText('Champion:');
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
    expect(
      await page.evaluate(() => window.localStorage.getItem('neon-pairs.preferences.v1')),
    ).toBe(soloPreferences);

    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.past-tournaments summary').first()).toContainText('Champion:');
    await expect(page.locator('.tournament-round').first().locator('tbody tr')).toHaveCount(2);
    await expect(page.locator('.past-tournaments summary')).toHaveCount(1);
    for (const [index, name] of ['Eli', 'Fox', 'Gwen', 'Hugo'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.past-tournaments summary')).toHaveCount(1);
  },
  {},
  undefined,
  TestTimeouts.long,
);
