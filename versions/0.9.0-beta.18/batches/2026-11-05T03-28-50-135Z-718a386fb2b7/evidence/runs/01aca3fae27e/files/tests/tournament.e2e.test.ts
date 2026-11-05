import { expect, test } from './browser-test.ts';
import { GAME_URL } from './game-fixture.ts';
import { generateBoard } from '../src/game/deck.ts';
import type { Page } from '@playwright/test';

async function playTurn(page: Page) {
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const json = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  const t = json.tournament;
  const deck = generateBoard(t.matches[t.index].boardCode).deck;
  for (const face of new Set(deck)) {
    const positions = deck.flatMap((n, i) => (n === face ? [i] : []));
    for (const position of positions) await page.locator('.card').nth(position).click();
  }
}

test('plays a four-player bracket and keeps its champion after reload', async ({ page }) => {
  await page.goto(GAME_URL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Now playing: Ada').first()).toBeVisible();
  for (let match = 0; match < 3; match++) {
    await playTurn(page);
    await page.getByRole('button', { name: 'Next turn' }).click();
    await playTurn(page);
    if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
  }
  await expect(page.getByText(/^Champion: /)).toBeVisible();
  const champion = await page.getByText(/^Champion: /).textContent();
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: champion! })).toBeVisible();
  const prefs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('neon-pairs.preferences.v1')!),
  );
  expect(prefs.size).toBe(4);
  expect(prefs.bestMoves).toEqual({});
});

test('exports a turn in progress and restores it paused', async ({ page }) => {
  await page.goto(GAME_URL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

test('validates eight-player names, preserves work on cancel, and reports unknown import fields', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (let i = 1; i <= 8; i++)
    await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i}`);
  await page.getByLabel('Player 8', { exact: true }).fill('player 1');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Each name must be different.').first()).toBeVisible();
  await page.getByLabel('Player 8', { exact: true }).fill('Player 8');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Bracket' }).getByRole('row').nth(1)).toContainText(
    'Player 8',
  );
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const data = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  data.tournament.matches[0].surprise = true;
  await page.getByLabel('Tournament JSON').fill(JSON.stringify(data));
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Unknown field: surprise.').first()).toBeVisible();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
});

test('shows a storage warning and keeps tournament setup usable when access is blocked', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto(GAME_URL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText("Progress won't be saved on this device.")).toBeVisible();
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Semifinal')).toBeVisible();
});
