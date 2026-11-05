import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';

test(
  'plays a knockout with shared deals, exports progress and keeps results after reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    const before = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await page.getByLabel('Player 1').fill('  Ada  ');
    await page.getByLabel('Player 2').fill('Bo');
    await page.getByLabel('Player 3').fill('Cy');
    await page.getByLabel('Player 4').fill('De');
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Ada').last()).toBeVisible();
    const codes: string[] = [];
    for (let match = 0; match < 3; match++) {
      await page.getByRole('button', { name: 'Export tournament' }).click();
      const exported = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
      const code: string = exported.tournament.matches[match].code;
      codes.push(code);
      const [, sizeText, seedText] = code.split('-');
      const size = Number(sizeText);
      expect(size).toBe(match === 2 ? 8 : 6);
      const deal = specDeal(size, Number(seedText));
      for (let turn = 0; turn < 2; turn++) {
        await page.getByRole('button', { name: 'Start turn' }).click();
        await expect(page.locator('.card')).toHaveCount(size * size);
        const indexes = Array.from({ length: (size * size) / 2 }, (_, face) =>
          deal.flatMap((v, i) => (v === face ? [i] : [])),
        ).flat();
        await page.locator('.board').evaluate((board, positions) => {
          const cards = board.querySelectorAll<HTMLButtonElement>('.card');
          for (const position of positions) cards[position]?.click();
        }, indexes);
        if (turn === 0) await page.getByRole('button', { name: 'Next turn' }).click();
      }
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    expect(new Set(codes).size).toBe(3);
    await expect(page.getByText(/^Champion: /)).toBeVisible();
    const champion = await page.getByText(/^Champion: /).textContent();
    await expect(page.getByRole('table', { name: 'Bracket' }).locator('tbody tr')).toHaveCount(3);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1')))
      .toBe(before);
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByText(champion!)).toBeVisible();
    await page.getByRole('button', { name: 'View tournament' }).click();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const json = await page.getByLabel('Tournament JSON').inputValue();
    expect(JSON.parse(json).format).toBe('neon-pairs/tournament');
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByText(champion!)).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('validates names and preserves a turn while loading or leaving', async ({ page, gameURL }) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (let i = 1; i <= 8; i++)
    await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i}`);
  await page.getByLabel('Player 8', { exact: true }).fill('PLAYER 1');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Each name must be different.')).toBeVisible();
  await page.getByLabel('Player 8', { exact: true }).fill('Player 8');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Bracket' }).locator('tbody tr')).toHaveCount(7);
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const saved = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByLabel('Tournament JSON').fill('{"unexpected":true}');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Unknown field: unexpected.')).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON').fill(saved);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.card').first()).toBeFocused();
});

test('confirms before leaving an unfinished solo game', async ({ page, gameURL }) => {
  await page.goto(gameURL);
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveCount(1);
});
