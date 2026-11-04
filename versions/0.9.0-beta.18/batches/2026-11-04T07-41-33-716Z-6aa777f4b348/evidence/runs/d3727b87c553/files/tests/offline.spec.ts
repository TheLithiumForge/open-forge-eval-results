import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { cards, loadBoard } from './gameDriver.ts';

test('single built HTML plays directly from disk with every network request blocked', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const network: string[] = [];
  const errors: string[] = [];
  await context.route(/^https?:/, (route) => { network.push(route.request().url()); return route.abort(); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+(?:stylesheet|modulepreload)|<audio|AudioContext|new Audio\(/i);
  expect(html).not.toContain('user-scalable=no');
  await context.close();
});

test('hidden markup contains position and neutral backs without face data', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const closed = await cards(page).evaluateAll((elements) => elements.map((element) => element.outerHTML));
  expect(new Set(closed.map((html) => html.replace(/Row \d+, column \d+/g, 'position').replace(/tabindex="-?\d+"/g, 'tabindex="0"'))).size).toBe(1);
  for (const html of closed) expect(html).not.toMatch(/cyan|magenta|marker|face(?:-|id|=)|data-/i);
  await cards(page).nth(0).hover();
  await cards(page).nth(0).click({ button: 'right' });
  await page.keyboard.press('Escape');
  await cards(page).nth(0).dispatchEvent('pointercancel');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards(page).nth(0).click();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
});
