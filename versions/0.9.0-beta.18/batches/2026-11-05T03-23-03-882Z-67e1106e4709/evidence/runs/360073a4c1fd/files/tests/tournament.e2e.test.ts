import { expect, test, TestTimeouts } from './browser-test.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import { specDeal } from './deal-oracle.ts';
import type { Page } from '@playwright/test';

async function click(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: true }).click();
}

for (const count of [4, 8])
  test(
    `${count} players finish the bracket, share each deal and reload their saved champion`,
    async ({ page, gameURL }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.goto(gameURL);
      await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
      const preference = await page.evaluate(() =>
        localStorage.getItem('neon-pairs.preferences.v1'),
      );
      await click(page, 'Tournament');
      await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
      await page.getByLabel('Players', { exact: true }).selectOption(String(count));
      const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'].slice(0, count);
      for (const [index, name] of names.entries())
        await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
      await click(page, 'Start tournament');
      const codes = new Set<string>();
      for (let match = 0; match < count - 1; match++) {
        await click(page, 'Export tournament');
        const decoded = decodeTournament(
          await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
        );
        const code = decoded.data?.tournament?.matches[match]?.boardCode;
        if (!code) throw new Error('Missing match deal.');
        expect(codes.has(code)).toBe(false);
        codes.add(code);
        const size = Number(code.split('-')[1]);
        const seed = Number(code.split('-')[2]);
        const deck = specDeal(size, seed);
        for (let turn = 0; turn < 2; turn++) {
          await expect(page.getByText(/^Now playing:/).first()).toBeVisible();
          await click(page, 'Start turn');
          await expect(page.locator('.card')).toHaveCount(size ** 2);
          await expect(page.locator('[aria-live]')).toHaveCount(1);
          // Identical times settle on entry seed. Every hidden deal is solved from the public code.
          for (let face = 0; face < deck.length / 2; face++) {
            for (const [index, value] of deck.entries())
              if (value === face) await page.locator('.card').nth(index).click();
          }
          if (turn === 0) await click(page, 'Next turn');
        }
        if (match < count - 2) await click(page, 'Next match');
      }
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      await expect(page.locator('table caption')).toHaveText('Bracket');
      await expect(page.locator('th[scope="col"]')).toHaveCount(6);
      expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
        preference,
      );
      await click(page, 'Export tournament');
      const finished = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
      expect(decodeTournament(finished).data?.tournament?.phase).toBe('complete');
      await click(page, 'Back to game');
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await page.reload();
      await click(page, 'Tournament');
      await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
      await click(page, `Champion: Ada · ${count} players`);
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      await click(page, 'Export tournament');
      expect(await page.getByLabel('Tournament JSON', { exact: true }).inputValue()).toBe(finished);
    },
    {},
    undefined,
    TestTimeouts.long,
  );
