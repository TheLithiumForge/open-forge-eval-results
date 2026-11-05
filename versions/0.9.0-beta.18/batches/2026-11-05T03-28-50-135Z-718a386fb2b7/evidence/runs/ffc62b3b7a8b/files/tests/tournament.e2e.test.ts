import { expect, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';
import type { Page } from '@playwright/test';

async function finishTurn(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const data = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  const code: string = data.tournament.matches.at(-1).boardCode;
  const deck = generateBoard(code).deck;
  for (let face = 0; face < deck.length / 2; face++) {
    const first = deck.indexOf(face);
    const second = deck.lastIndexOf(face);
    await page.locator('.card').nth(first).click();
    await page.locator('.card').nth(second).click();
  }
  return code;
}

test(
  'a shared-device tournament completes, exports and survives reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [i, name] of ['Ada', 'Bo', 'Cy', 'De'].entries())
      await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Ada').last()).toBeVisible();
    const codes: string[] = [];
    for (let match = 0; match < 3; match++) {
      const first = await finishTurn(page);
      await page.getByRole('button', { name: 'Next turn' }).click();
      const second = await finishTurn(page);
      expect(second).toBe(first);
      codes.push(first);
      await page.getByRole('button', { name: 'Next match' }).click();
    }
    expect(new Set(codes).size).toBe(3);
    await expect(page.getByText(/^Champion: /).last()).toBeVisible();
    await page.getByRole('button', { name: 'Export tournament' }).click();
    const exported = await page.getByLabel('Tournament JSON').inputValue();
    expect(JSON.parse(exported).format).toBe('neon-pairs/tournament');
    expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
      preferences,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('summary').filter({ hasText: 'Champion:' })).toHaveCount(1);
    await page.getByLabel('Tournament JSON').fill(exported);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByRole('heading', { name: 'Tournament complete' })).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('validates names, preserves invalid imports and confirms leaving', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Use 2 to 20 characters.').last()).toBeVisible();
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  for (const [i, name] of ['Ada', 'Bo', 'Cy', 'De'].entries())
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByLabel('Tournament JSON').fill('{');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Invalid tournament.').last()).toBeVisible();
  await expect(page.getByText('Now playing: Ada').last()).toBeVisible();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Now playing: Ada').last()).toBeVisible();
});

test('an exported turn resumes its progress and blocked storage leaves play available', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText("Progress won't be saved on this device.")).toBeVisible();
  for (const [i, name] of ['Ada', 'Bo', 'Cy', 'De'].entries())
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const exported = await page.getByLabel('Tournament JSON').inputValue();
  const snapshot = JSON.parse(JSON.parse(exported).snapshot);
  expect(snapshot.selection.kind).toBe('one');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByText('Now playing: Ada').last()).toBeVisible();
  await expect(page.locator('.card').first()).toHaveAttribute('aria-label', /revealed/);
  await page.locator('.card').nth(1).click();
  await expect(page.locator('.stats dd').first()).toHaveText('1');
});
