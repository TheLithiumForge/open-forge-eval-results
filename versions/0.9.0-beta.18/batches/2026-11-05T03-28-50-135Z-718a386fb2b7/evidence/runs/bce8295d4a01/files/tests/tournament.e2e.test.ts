import assert from 'node:assert/strict';
import { expect, test, TestTimeouts } from './browser-test.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { finishTournamentBoard } from './tournament-solver.ts';

test(
  'four-player tournament uses shared deals, exports and reloads its champion history',
  async ({ page, gameURL }) => {
    const preferences = { schemaVersion: 1, size: 10, bestMoves: { '4': 8 } };
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
      key: PREFERENCES_KEY,
      value: preferences,
    });
    await page.clock.install();
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', level: 2 })).toBeFocused();
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();

    for (let match = 0; match < 3; match += 1) {
      await page.getByRole('button', { name: 'Start turn', exact: true }).click();
      if (match === 0) {
        await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
        const draft = await page.locator('#tournament-json').inputValue();
        assert.match(draft, /"format": "neon-pairs\/tournament"/);
        await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
      }
      await finishTournamentBoard(page);
      await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Next turn', exact: true }).click();
      await finishTournamentBoard(page);
      if (match < 2) {
        await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
    }

    const champion = page.locator('.tournament-current h3').filter({ hasText: /^Champion:/ });
    await expect(champion).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to game', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
    const exported = await page.locator('#tournament-json').inputValue();
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(champion).toBeVisible();
    await expect(page.locator('.tournament-history summary')).toContainText('Champion:');
    const savedPreferences = await page.evaluate(
      (key) => localStorage.getItem(key),
      PREFERENCES_KEY,
    );
    assert.deepEqual(JSON.parse(savedPreferences ?? 'null'), preferences);

    await page.reload();
    await expect(page.locator('.card')).toHaveCount(100);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.tournament-history summary')).toContainText('Champion:');
    await expect(page.locator('#tournament-json')).toHaveValue('');
    assert.match(exported, /"championSeed":/);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test(
  'eight-player pairing, name validation and early leave follow the tournament screen',
  async ({ page, gameURL }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByLabel('Player 2', { exact: true }).fill('ada');
    await page.getByLabel('Player 1', { exact: true }).fill('A');
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.locator('#tournament-entry-notice')).toHaveText('Use 2 to 20 characters.');
    await page.getByLabel('Player 1', { exact: true }).fill('Ada');
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.locator('#tournament-entry-notice')).toHaveText(
      'Each name must be different.',
    );
    await page.getByLabel('Player 2', { exact: true }).fill('Bo');
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    const targets = await page
      .locator('.tournament-screen .control:visible')
      .evaluateAll((controls) =>
        controls.map((control) => {
          const box = control.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      );
    assert.ok(
      targets.every((target) => target.width >= 44 && target.height >= 44),
      JSON.stringify(targets),
    );
    await expect(page.locator('.tournament-current')).toContainText('Round: Quarterfinal');
    await expect(page.locator('.tournament-bracket tbody tr').nth(0)).toContainText('Ada');
    await expect(page.locator('.tournament-bracket tbody tr').nth(0)).toContainText('Hal');
    await expect(page.locator('.tournament-bracket tbody tr').nth(1)).toContainText('Dev');
    await expect(page.locator('.tournament-bracket tbody tr').nth(1)).toContainText('Emi');
    await expect(page.locator('.tournament-now-playing')).toHaveText('Now playing: Ada');
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Leave tournament?' });
    await expect(dialog.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await dialog.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  },
  {},
  undefined,
  TestTimeouts.long,
);

test(
  'tournament play continues and explains that history will not save when storage is blocked',
  async ({ page, gameURL }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new DOMException('Blocked', 'SecurityError');
        },
      });
    });
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.tournament-history')).toContainText(
      "Progress won't be saved on this device.",
    );
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await page.locator('.tournament-current .card').nth(0).click();
    await expect(page.locator('.tournament-current .card').nth(0)).toHaveClass(/revealed/);
  },
  {},
  undefined,
  TestTimeouts.long,
);
