import { expect, test, TestTimeouts } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { enterTournament, tournamentJSON } from './tournament-fixture.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';
import { finishedExampleTournament } from '../src/game/tournament/tournament.fixture.ts';

test('opening Tournament asks before discarding an unfinished solo game', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('blocked storage keeps tournaments usable in memory with a notice by history', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    }),
  );
  await loadTimedBoard(page);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  const json = encodeTournament(finishedExampleTournament());
  await page.getByLabel('Tournament JSON', { exact: true }).fill(json);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Tournament 1: Champion: Ada', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
});

test('corrupt stored tournaments stay untouched until an accepted completion is saved', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.evaluate(() => localStorage.setItem('np3:tournaments', '{broken'));
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText('No finished tournaments yet.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('np3:tournaments'))).toBe('{broken');
  await page
    .getByLabel('Tournament JSON', { exact: true })
    .fill(encodeTournament(finishedExampleTournament()));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('np3:tournaments'))).not.toBe('{broken');
});

for (const viewport of [
  { width: 390, height: 800 },
  { width: 640, height: 400 },
])
  test(
    `tournament controls and results fit at ${viewport.width}px with reduced motion`,
    async ({ page, gameURL }, artifacts) => {
      await loadTimedBoard(page, gameURL);
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await page.getByLabel('Players', { exact: true }).selectOption('8');
      const measure = async () => {
        const targets = await page
          .locator(
            'main button:visible, main input:visible, main select:visible, main textarea:visible',
          )
          .evaluateAll((elements) =>
            elements.map((element) => {
              const bounds = element.getBoundingClientRect();
              return { width: bounds.width, height: bounds.height };
            }),
          );
        for (const target of targets) {
          expect(target.width).toBeGreaterThanOrEqual(44);
          expect(target.height).toBeGreaterThanOrEqual(44);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(page.locator('[aria-live]')).toHaveCount(1);
      };
      await measure();
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await enterTournament(page, 8);
      await measure();
      await page.getByRole('button', { name: 'Start turn', exact: true }).click();
      await page.locator('.card').first().focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      await page.clock.runFor(800);
      await measure();
      await tournamentJSON(page);
      await page.screenshot({ path: artifacts.outputPath('tournament.png'), fullPage: true });
      const motion = await page
        .locator('.tournament-screen, .tournament-screen *')
        .evaluateAll((elements) =>
          elements.every((element) => {
            const style = getComputedStyle(element);
            return style.animationName === 'none' && parseFloat(style.transitionDuration) === 0;
          }),
        );
      expect(motion).toBe(true);
      const field = 'unexpected'.repeat(24);
      await page
        .getByLabel('Tournament JSON', { exact: true })
        .fill(JSON.stringify({ [field]: true }));
      await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText(`Unknown field: ${field}.`);
      await measure();
    },
    { viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, reducedMotion: 'reduce' },
    undefined,
    TestTimeouts.long,
  );
