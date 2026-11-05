import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import type { Page } from '@playwright/test';

async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).first().click();
  return JSON.parse(await page.getByLabel('Tournament JSON', { exact: true }).inputValue());
}
async function finish(page: Page, code: string) {
  const [, sizeText, seedText] = code.split('-');
  const deck = specDeal(Number(sizeText), Number(seedText));
  for (let face = 0; face < deck.length / 2; face++) {
    const pair = deck.flatMap((value, index) => (value === face ? [index] : []));
    for (const index of pair) await page.locator('.card').nth(index).click();
  }
}
test(
  'plays a tournament, transfers a turn, and saves the champion after reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    const solo = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(
      page.locator('.tournament-current > p').filter({ hasText: 'Now playing: Ada' }),
    ).toBeVisible();
    for (let match = 0; match < 3; match++) {
      let code = '';
      for (let turn = 0; turn < 2; turn++) {
        await page.getByRole('button', { name: 'Start turn' }).click();
        const document = await exported(page);
        const currentCode = document.tournament.matches[match].code;
        if (turn === 0) code = currentCode;
        else expect(currentCode).toBe(code);
        await finish(page, code);
        if (turn === 0) await page.getByRole('button', { name: 'Next turn' }).click();
      }
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    const champion = await page.locator('.champion').textContent();
    expect(champion).toMatch(/^Champion: /);
    const completed = await exported(page);
    expect(
      completed.tournament.matches.every(
        (match: { winner: number | null }) => match.winner !== null,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(solo);
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.past summary')).toHaveText(champion ?? '');
    await page.getByLabel('Tournament JSON', { exact: true }).fill(JSON.stringify(completed));
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.locator('.champion')).toHaveText(champion ?? '');
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('validates names and restores an unfinished turn without accepting corrupt JSON', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  const names = ['  Ada  ', 'BO', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
  for (const [index, name] of names.entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByLabel('Player 2', { exact: true }).fill(' ada ');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.locator('.tournament-setup')).toContainText('Each name must be different.');
  await page.getByLabel('Player 2', { exact: true }).fill('BO');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  const initial = await exported(page);
  expect(
    initial.tournament.matches.slice(0, 4).map((match: { players: number[] }) => match.players),
  ).toEqual([
    [0, 7],
    [3, 4],
    [2, 5],
    [1, 6],
  ]);
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  const saved = await exported(page);
  const draft = JSON.stringify({ ...saved, extra: true });
  await page.getByLabel('Tournament JSON', { exact: true }).fill(draft);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.locator('#tournament-notice')).toHaveText('Unknown field: extra.');
  await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue(draft);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON', { exact: true }).fill(JSON.stringify(saved));
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
});

test('keeps corrupt history untouched and reports inaccessible storage', async ({
  page,
  gameURL,
  browser,
}) => {
  await page.goto(gameURL);
  await page.evaluate(() => localStorage.setItem('np3:tournaments', '{broken'));
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.locator('.past')).toContainText('No past tournaments yet.');
  expect(await page.evaluate(() => localStorage.getItem('np3:tournaments'))).toBe('{broken');
  const context = await browser.newContext();
  try {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('denied');
        },
      });
    });
    const blocked = await context.newPage();
    await blocked.goto(gameURL);
    await blocked.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(blocked.locator('.past')).toContainText("Progress won't be saved on this device.");
  } finally {
    await context.close();
  }
});
