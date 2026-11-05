import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import type { Page } from '@playwright/test';

async function finishTurn(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const exported = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  const code: string =
    exported.tournament.snapshot && JSON.parse(exported.tournament.snapshot).boardCode;
  const [, size, seed] = code.split('-');
  const deck = specDeal(Number(size), Number(seed));
  for (let face = 0; face < deck.length / 2; face++) {
    for (let index = 0; index < deck.length; index++) {
      if (deck[index] === face) await page.locator('.card').nth(index).click();
    }
  }
  return code;
}

test(
  'plays a four-player knockout, shares deals, exports, and retains the champion',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Ada').first()).toBeVisible();
    const used: string[] = [];
    for (let match = 0; match < 3; match++) {
      const first = await finishTurn(page);
      await page.getByRole('button', { name: 'Next turn' }).click();
      const second = await finishTurn(page);
      expect(first).toBe(second);
      expect(used).not.toContain(first);
      used.push(first);
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const json = await page.getByLabel('Tournament JSON').inputValue();
    expect(JSON.parse(json).format).toBe('neon-pairs/tournament');
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      preferences,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Champion: / })).toBeVisible();
    await page.getByLabel('Tournament JSON').fill(json);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByText(/^Champion: /).first()).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('round-trips setup, preserves invalid drafts, and confirms leaving play', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await page.getByLabel('Player 8').fill('Hal');
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const setup = await page.getByLabel('Tournament JSON').inputValue();
  expect(JSON.parse(setup).format).toBe('neon-pairs/tournament-setup');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByLabel('Player 8')).toHaveValue('Hal');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${index + 1}`).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByLabel('Tournament JSON').fill('{broken');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Invalid tournament.')).toBeVisible();
  await expect(page.getByLabel('Tournament JSON')).toHaveValue('{broken');
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Now playing: Ada').first()).toBeVisible();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
});
