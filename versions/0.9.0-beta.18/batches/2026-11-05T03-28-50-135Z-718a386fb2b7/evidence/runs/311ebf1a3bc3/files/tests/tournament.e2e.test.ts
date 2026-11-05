import { expect, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';

// Complete each board using its exported deal; this tests the whole device handoff and save path.
test(
  'plays and saves a four-player knockout, with matching deals and isolated solo preferences',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByLabel('Grid size').selectOption('10');
    const before = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Round: Semifinal')).toBeVisible();
    for (let match = 0; match < 3; match++) {
      await page.getByRole('button', { name: 'Export tournament' }).click();
      const state = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
      const deck = generateBoard(state.matches[match].boardCode).deck;
      const pairs: number[][] = [];
      for (let face = 0; face < deck.length / 2; face++)
        pairs.push(deck.flatMap((value, i) => (value === face ? [i] : [])));
      for (let player = 0; player < 2; player++) {
        await page.getByRole('button', { name: 'Start turn' }).click();
        await expect(page.locator('.card')).toHaveCount(deck.length);
        await page.evaluate(async (positions) => {
          for (const pair of positions)
            for (const index of pair) {
              const card = document.querySelectorAll<HTMLButtonElement>('.card')[index];
              card?.click();
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }, pairs);
        if (player === 0) {
          await expect(page.getByRole('button', { name: 'Next turn' })).toBeVisible();
          await page.getByRole('button', { name: 'Next turn' }).click();
        }
      }
      if (match < 2) {
        await expect(page.getByRole('button', { name: 'Next match' })).toBeVisible();
        await page.getByRole('button', { name: 'Next match' }).click();
      }
    }
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
    await expect(page.getByRole('table', { name: 'Bracket' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      before,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Champion: / })).toHaveCount(1);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('restores an eight-player turn from JSON and keeps unfinished play on cancellation', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (let i = 1; i <= 8; i++)
    await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i}`);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await expect(page.getByText('Now playing: Player 1').last()).toBeVisible();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const saved = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByLabel('Tournament JSON').fill('{"format":"neon-pairs/tournament","extra":true}');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: extra.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON').fill(saved);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.card').first()).toBeFocused();
});

test('shows the history warning when storage is blocked and keeps tournament setup usable', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText("Progress won't be saved on this device.")).toBeVisible();
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByRole('button', { name: 'Start turn' })).toBeVisible();
});
