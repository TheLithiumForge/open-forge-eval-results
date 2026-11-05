import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { exportTournament } from '../src/game/tournament/format.ts';
import { finishTurn, newTournament } from '../src/game/tournament/rules.ts';

test(
  'players share a deal, hand off and keep solo preferences',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const saved = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
    const code: string = saved.tournament.matches[0].code;
    const seed = Number(code.split('-')[2]);
    const deck = specDeal(6, seed);
    const pairs = Array.from({ length: 18 }, (_, face) =>
      deck.flatMap((value, index) => (value === face ? [index] : [])),
    );
    for (const name of ['Ada', 'Dev']) {
      await expect(page.getByText(`Now playing: ${name}`, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Start turn' }).click();
      for (const pair of pairs)
        for (const index of pair) await page.locator('.card').nth(index).click();
      if (name === 'Ada') {
        await page.getByRole('button', { name: 'Next turn' }).click();
      }
    }
    await expect(page.getByRole('button', { name: 'Next match' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Bracket' })).toContainText('18');
    await page.getByRole('button', { name: 'Next match' }).click();
    await expect(page.getByText('Now playing: Bo', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Leave tournament' }).click();
    await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Leave tournament' }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByLabel('Grid size')).toHaveValue('4');
    await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('loads a final result, saves the champion and retains it after reload', async ({
  page,
  gameURL,
}) => {
  const names = ['Ada', 'Bo', 'Cora', 'Dev'];
  let event = newTournament(names, ['np1-6-1', 'np1-6-2', 'np1-8-3']);
  for (let i = 0; i < 3; i++) {
    event = { ...event, current: i };
    const minimum = i === 2 ? 32 : 18;
    event = finishTurn(event, { moves: minimum, elapsedMs: 1000 });
    event = finishTurn(event, { moves: minimum + 1, elapsedMs: 900 });
  }
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Tournament JSON').fill(exportTournament(event));
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(page.getByRole('heading', { name: 'Champion: Ada' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
  await page.getByRole('button', { name: 'Champion: Ada' }).click();
  await expect(page.getByRole('heading', { name: 'Champion: Ada' })).toBeVisible();
});

test('export restores an unfinished turn paused and invalid imports preserve the draft', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${index + 1}`).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const saved = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByLabel('Tournament JSON').fill('{"extra":true}');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: extra.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON').fill(saved);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').first()).toBeFocused();
});

test('warns near history when browser storage is unavailable', async ({ page, gameURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText("Progress won't be saved on this device.")).toBeVisible();
  await page.getByLabel('Players').selectOption('8');
  await expect(page.getByLabel('Player 8')).toBeVisible();
});
