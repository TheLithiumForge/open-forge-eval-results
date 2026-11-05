import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import { matchPlayers } from '../src/game/tournament/rules.ts';
import type { Page } from '@playwright/test';

const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const document = decodeTournament(text);
  if (typeof document === 'string' || !document.tournament) throw new Error(document.toString());
  return { document, tournament: document.tournament, text };
}

for (const count of [4, 8])
  test(
    `${count} players complete a knockout with shared deals, isolated records and reloaded history`,
    async ({ page, gameURL }, artifacts) => {
      await page.clock.install();
      await page.goto(gameURL);
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await page.getByLabel('Grid size', { exact: true }).selectOption('10');
      const preferences = await page.evaluate(() =>
        localStorage.getItem('neon-pairs.preferences.v1'),
      );
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
      await page.getByLabel('Players', { exact: true }).selectOption(String(count));
      for (let index = 0; index < count; index++)
        await page
          .getByLabel(`Player ${index + 1}`, { exact: true })
          .fill(names[index] ?? 'Player');
      await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
      await expect(page.locator('.card')).toHaveCount(0);
      for (let match = 0; match < count - 1; match++) {
        const before = await exported(page);
        const code = before.tournament.matches[match]?.boardCode;
        if (!code) throw new Error('Missing match deal.');
        const board = generateBoard(code);
        const players = matchPlayers(before.tournament, match);
        const pairs = new Map<number, number[]>();
        board.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
        for (let turn = 0; turn < 2; turn++) {
          await expect(page.locator('.tournament-owner')).toHaveText(
            `Now playing: ${names[players[turn] ?? 0]}`,
          );
          await page.getByRole('button', { name: 'Start turn', exact: true }).click();
          await expect(page.locator('.card')).toHaveCount(board.deck.length);
          expect((await exported(page)).document.game?.boardCode).toBe(code);
          const positions = [...pairs.values()].flat();
          for (const index of positions.slice(0, 2))
            await page.locator('.card').nth(index).press('Enter', { noWaitAfter: true });
          await expect(page.locator('.card.matched')).toHaveCount(2);
          // Finish through the public card buttons so this journey concentrates on handoffs.
          await page.locator('.card').evaluateAll((cards, indices) => {
            for (const index of indices) {
              const card = cards[index];
              if (!(card instanceof HTMLButtonElement)) throw new Error('Missing card button.');
              card.click();
            }
          }, positions.slice(2));
          await expect(page.getByRole('status')).toHaveCount(1);
          if (turn === 0)
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        }
        if (match < count - 2)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      await expect(page.getByRole('heading', { name: 'Tournament complete' })).toBeFocused();
      await expect(page.getByRole('table')).toHaveCount(1);
      const finished = await exported(page);
      expect(finished.tournament.matches.every((match) => match.results.length === 2)).toBe(true);
      expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
        preferences,
      );
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(page.locator('.tournament-history button')).toHaveCount(1);
      await page.locator('.tournament-history button').click();
      expect((await exported(page)).tournament).toEqual(finished.tournament);
      await page.getByRole('button', { name: 'Tournament screen', exact: true }).click();
      await page.getByLabel('Tournament JSON', { exact: true }).fill(finished.text);
      await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
    },
    { viewport: { width: 390, height: 844 } },
    Scrollbars.hidden,
    TestTimeouts.long,
  );

test(
  'name errors, native leave confirmation, unknown fields and paused imports preserve play',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await expect(page.getByText('Use 2 to 20 characters.', { exact: true })).toHaveCount(5);
    for (let index = 0; index < 4; index++)
      await page
        .getByLabel(`Player ${index + 1}`, { exact: true })
        .fill(index === 0 ? '  Ada  ' : (names[index] ?? 'Player'));
    await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await page.locator('.card').nth(0).click();
    const saved = await exported(page);
    const status = page.getByRole('status');
    const originalRegion = await status.elementHandle();
    await page
      .getByLabel('Tournament JSON', { exact: true })
      .fill(saved.text.replace('"version": 1', '"extra": true, "version": 1'));
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.locator('#tournament-notice')).toHaveText('Unknown field: extra.');
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await page.getByLabel('Tournament JSON', { exact: true }).fill(saved.text);
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Load tournament', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.locator('.card')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    expect(await originalRegion?.evaluate((element) => element.isConnected)).toBe(true);
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByLabel('Players', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await expect(page.locator('.tournament-history button')).toHaveCount(0);
    for (const control of await page
      .locator(
        '.tournament-header button, .tournament-header input, .tournament-header select, .tournament-exchange button, .tournament-exchange textarea',
      )
      .all()) {
      const bounds = await control.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
  },
  { viewport: { width: 390, height: 844 } },
);

test('blocked storage keeps tournament setup available with a saved records notice', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('denied');
      },
    }),
  );
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('#tournament-notice')).toHaveText('Loaded tournament.');
});
