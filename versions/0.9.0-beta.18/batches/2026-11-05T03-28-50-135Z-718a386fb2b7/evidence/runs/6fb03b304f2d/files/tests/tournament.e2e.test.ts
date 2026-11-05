import { expect, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';
import {
  createTournament,
  recordScore,
  encodeExchange,
} from '../src/game/tournament/tournament.ts';
import type { Page } from '@playwright/test';

async function playTurn(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const json: unknown = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  if (
    !json ||
    typeof json !== 'object' ||
    !('tournament' in json) ||
    !json.tournament ||
    typeof json.tournament !== 'object' ||
    !('matches' in json.tournament) ||
    !('current' in json.tournament) ||
    !Array.isArray(json.tournament.matches) ||
    typeof json.tournament.current !== 'number'
  )
    throw new Error('Missing tournament');
  const match: unknown = json.tournament.matches[json.tournament.current];
  if (!match || typeof match !== 'object' || !('code' in match) || typeof match.code !== 'string')
    throw new Error('Missing code');
  const deck = generateBoard(match.code).deck;
  for (let face = 0; face < deck.length / 2; face++) {
    for (let i = 0; i < deck.length; i++)
      if (deck[i] === face) await page.locator('.card').nth(i).click();
  }
  return match.code;
}

test(
  'plays a shared-deal knockout, persists the champion and restores an export',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    await expect(page.getByLabel('Player 8')).toBeVisible();
    await page.getByLabel('Players', { exact: true }).selectOption('4');
    for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${i + 1}`).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Ada', { exact: true }).first()).toBeVisible();
    for (let match = 0; match < 3; match++) {
      const first = await playTurn(page);
      await page.getByRole('button', { name: 'Next turn' }).click();
      const second = await playTurn(page);
      expect(second).toBe(first);
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const exported = await page.getByLabel('Tournament JSON').inputValue();
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      preferences,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: 'View tournament' })).toBeVisible();
    await page.getByLabel('Tournament JSON').fill(exported);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('restores an unfinished turn and protects it from invalid loads and accidental departure', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${i + 1}`).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const exported = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByLabel('Tournament JSON').fill('{');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Invalid tournament.', { exact: true })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON').fill(exported);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByText('Now playing: Ada', { exact: true }).first()).toBeVisible();
});

test('adds a loaded completed tournament to past tournaments', async ({ page, gameURL }) => {
  let event = createTournament(['Ada', 'Bo', 'Cora', 'Dev']);
  for (let match = 0; match < 3; match++) {
    const moves = match === 2 ? 32 : 18;
    event = recordScore(event, { moves, elapsedMs: 100 });
    event = recordScore(event, { moves, elapsedMs: 200 });
    if (match < 2) event = { ...event, current: match + 1, phase: 'ready' };
  }
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Tournament JSON').fill(encodeExchange(event, null));
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View tournament' })).toBeVisible();
});
