import { expect, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';

test(
  'plays a tournament, shares each deal, and restores finished history',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.evaluate(() =>
      localStorage.setItem(
        'neon-pairs.preferences.v1',
        JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { '6': 20 } }),
      ),
    );
    await page.reload();
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    for (let match = 0; match < 3; match++) {
      let firstCode = '';
      for (let player = 0; player < 2; player++) {
        await page.getByRole('button', { name: 'Start turn' }).click();
        await page.getByRole('button', { name: 'Export tournament' }).click();
        const data = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
        const code: string = JSON.parse(data.tournament.game).boardCode;
        if (player === 0) firstCode = code;
        else expect(code).toBe(firstCode);
        const deck = generateBoard(code).deck;
        const pairs = new Map<number, number[]>();
        deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
        for (const pair of pairs.values())
          for (const index of pair) await page.locator('.card').nth(index).click();
        if (player === 0) await page.getByRole('button', { name: 'Next turn' }).click();
      }
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      preferences,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Champion: / })).toHaveCount(1);
    await page.getByRole('button', { name: /^Champion: / }).click();
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const finished = await page.getByLabel('Tournament JSON').inputValue();
    await page.evaluate(() => localStorage.removeItem('neon-pairs.tournaments.v1'));
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByLabel('Tournament JSON').fill(finished);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Champion: / })).toHaveCount(1);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('validates eight-player setup, restores an exported turn, and confirms leaving', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (let i = 1; i <= 8; i++)
    await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i}`);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await expect(page.getByText('Now playing: Player 1').first()).toBeVisible();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const exported = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByLabel('Tournament JSON').fill('{');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid tournament.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON').fill(exported);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
});
