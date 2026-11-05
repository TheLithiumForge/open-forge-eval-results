import { expect, test } from './browser-test.ts';
import { startBrowserTournament, tournamentText, tournamentCodes } from './tournament-fixture.ts';

test('an active tournament exports progress, rejects unknown fields and resumes a loaded turn explicitly', async ({
  page,
  gameURL,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(gameURL);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await startBrowserTournament(page);
  const codes = await tournamentCodes(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await page.clock.runFor(1234);
  const active = await tournamentText(page);
  const json = page.getByLabel('Tournament JSON', { exact: true });
  await json.fill(active.replace('"setup": {', '"setup": { "surprise": true,'));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: surprise.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await json.fill(active);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Load tournament', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(10_000);
  expect(await tournamentText(page)).toBe(active);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.locator('.stats dd').nth(2)).toHaveText('0:01');
  expect(await tournamentCodes(page)).toEqual(codes);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText('No finished tournaments yet.', { exact: true })).toBeVisible();
});

test('setup validates normalized names, exports settings and fits new controls on a phone', async ({
  page,
  gameURL,
}, artifacts) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  const setup = await tournamentText(page);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (const [index, name] of ['  Ada   Lovelace ', 'Bo', 'Cora', ' ada lovelace '].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 4', { exact: true }).fill('Dev');
  const dimensions = await page
    .locator('.tournament button, .tournament select, .tournament input, .tournament textarea')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    );
  for (const bounds of dimensions) {
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: artifacts.outputPath('tournament-setup-phone.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByText('Now playing: Ada Lovelace', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: artifacts.outputPath('tournament-bracket-phone.png'),
    fullPage: true,
  });
  await page.getByLabel('Tournament JSON', { exact: true }).fill(setup);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('');
});

test('blocked tournament storage presents its notice and keeps the setup usable', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await startBrowserTournament(page);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start tournament', exact: true })).toBeVisible();
});
