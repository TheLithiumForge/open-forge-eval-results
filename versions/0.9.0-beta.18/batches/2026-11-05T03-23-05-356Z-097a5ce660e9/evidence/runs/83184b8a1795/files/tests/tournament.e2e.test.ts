import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import type { Page } from '@playwright/test';

async function finish(page: Page, code: string) {
  const parts = code.split('-');
  const deck = specDeal(Number(parts[1]), Number(parts[2]));
  for (let face = 0; face < deck.length / 2; face++) {
    const first = deck.indexOf(face),
      second = deck.lastIndexOf(face);
    await page.locator('.card').nth(first).click();
    await page.locator('.card').nth(second).click();
  }
}
test(
  'plays a tournament, shares it, and retains the champion after reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${i + 1}`).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Now playing: Ada' })).toBeVisible();
    const codes: string[] = [];
    for (let match = 0; match < 3; match++) {
      await page.getByRole('button', { name: 'Export tournament' }).click();
      const data = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
      const code: string = data.tournament.matches.at(-1).code;
      codes.push(code);
      expect(Number(code.split('-')[1])).toBe(match < 2 ? 6 : 8);
      for (let turn = 0; turn < 2; turn++) {
        if (turn) await page.getByRole('button', { name: 'Next turn' }).click();
        await page.getByRole('button', { name: 'Start turn' }).click();
        await finish(page, code);
      }
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    expect(new Set(codes).size).toBe(3);
    await expect(page.getByText(/^Champion: /)).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const exported = await page.getByLabel('Tournament JSON').inputValue();
    expect(JSON.parse(exported).format).toBe('neon-pairs/tournament');
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      preferences,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Champion: / })).toBeVisible();
    await page.getByLabel('Tournament JSON').fill(exported);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByText(/^Champion: /)).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('validates names and safely restores an unfinished eight-player turn', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'].entries())
    await page.getByLabel(`Player ${i + 1}`).fill(name);
  await page.getByLabel('Player 8').fill(' ada ');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 8').fill('Hal');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const exported = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByLabel('Tournament JSON').fill('{"bad":true}');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: bad.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON').fill(exported);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start turn' }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});
