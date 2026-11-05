import { expect, test } from './browser-test.ts';
import { tournamentExport } from './tournament-fixture.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';

test(
  'validates names and imports before replacing play and confirms unfinished departures',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(gameURL);
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
    for (const [i, name] of ['  Ada   Lovelace  ', 'Bo', 'Cy', 'ada lovelace'].entries())
      await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Each name must be different.');
    await page.getByLabel('Player 4', { exact: true }).fill('De');
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Now playing: Ada Lovelace');
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await page.locator('.card').first().click();
    const active = await tournamentExport(page);
    await page.getByLabel('Tournament JSON', { exact: true }).fill('{"unknown":true}');
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Unknown field: unknown.');
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue(
      '{"unknown":true}',
    );
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toBeFocused();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByLabel('Tournament JSON', { exact: true }).fill(encodeTournament(active));
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
    await page.clock.runFor(5000);
    expect((await tournamentExport(page)).snapshot).toBe(active.snapshot);
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await expect(page.locator('[aria-live]')).toHaveCount(1);
  },
  { viewport: { width: 390, height: 844 } },
);
