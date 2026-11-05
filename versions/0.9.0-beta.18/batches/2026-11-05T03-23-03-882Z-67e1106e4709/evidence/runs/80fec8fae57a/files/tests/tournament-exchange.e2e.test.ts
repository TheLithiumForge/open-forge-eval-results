import { test, expect } from './browser-test.ts';
import { enterTournament, exportedTournament, tournamentDeal } from './tournament-fixture.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';
import { completedTournament } from '../src/game/tournament/tournament.fixture.ts';

test('invalid imports preserve the turn and valid imports resume only after Start turn', async ({
  page,
  gameURL,
}) => {
  await enterTournament(page, gameURL, 8);
  const deck = await tournamentDeal(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1234);
  await exportedTournament(page);
  const saved = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  await page
    .getByLabel('Tournament JSON', { exact: true })
    .fill(saved.replace('"version": 1', '"extra": 1, "version": 1'));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unknown field: extra.');
  await expect(page.locator('dialog')).toHaveCount(0);
  await expect(page.locator('.card').nth(0)).not.toHaveAttribute('aria-label', /closed/);
  await page.getByLabel('Tournament JSON', { exact: true }).fill(saved);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.clock.runFor(5000);
  expect(await exportedTournament(page)).toEqual(JSON.parse(saved));
  await page.locator('.card').nth(1).click();
  expect(await exportedTournament(page)).toEqual(JSON.parse(saved));
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page
    .locator('.card')
    .nth(deck.findIndex((face, index) => index !== 0 && face === deck[0]))
    .click();
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
});

test('blocked storage keeps imported results available in memory and leaves solo records intact', async ({
  page,
  context,
  gameURL,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Tournament JSON', { exact: true }).fill(
    encodeTournament({
      setup: null,
      tournament: completedTournament(),
    }),
  );
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByText('Champion: Player 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Past tournaments', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '4 players · Champion: Player 1', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(1);
});
