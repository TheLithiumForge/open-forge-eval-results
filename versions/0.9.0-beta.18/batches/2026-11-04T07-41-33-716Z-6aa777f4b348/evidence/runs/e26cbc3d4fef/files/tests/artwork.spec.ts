import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/game.ts';
import { almostWon, cards, loadSnapshot, snapshot } from './actions.ts';

test('renders all 128 identities as an inspectable grayscale sheet at 44px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const game = createGame('np1-16-1');
  await loadSnapshot(page, snapshot({ boardCode: game.board.code,
    matched: game.deck.map((_, index) => index), moves: 128, started: true }));
  await expect(page.locator('.card-face')).toHaveCount(256);
  const positions = Array.from({ length: 128 }, (_, face) => game.deck.indexOf(face));
  await page.evaluate((indices) => {
    const originals = [...document.querySelectorAll('.card')];
    const sheet = document.createElement('section');
    sheet.id = 'face-sheet';
    sheet.style.cssText = 'display:grid;grid-template-columns:repeat(16,44px);gap:6px;padding:16px;width:max-content;background:#090B14;filter:grayscale(1)';
    indices.forEach((index, face) => {
      const original = originals[index];
      if (!(original instanceof HTMLButtonElement)) throw new Error('Missing revealed face.');
      const tile = document.createElement('div');
      const copy = original.cloneNode(true);
      if (!(copy instanceof HTMLButtonElement)) throw new Error('Invalid cloned card.');
      copy.style.cssText = 'width:44px;height:44px';
      copy.querySelector('.card-check')?.remove();
      const label = document.createElement('p');
      label.textContent = String(face);
      label.style.cssText = 'text-align:center;font-size:14px';
      tile.append(copy, label);
      sheet.append(tile);
    });
    document.body.replaceChildren(sheet);
  }, positions);
  await expect(page.locator('#face-sheet .card')).toHaveCount(128);
  expect(await page.locator('#face-sheet .card').evaluateAll((nodes) => nodes.every((node) => {
    const bounds = node.getBoundingClientRect();
    return bounds.width === 44 && bounds.height === 44;
  }))).toBe(true);
  const drawings = await page.locator('#face-sheet .card-face').evaluateAll((nodes) => nodes.map((node) => node.innerHTML));
  expect(new Set(drawings).size).toBe(128);
  await mkdir('evidence', { recursive: true });
  await page.locator('#face-sheet').screenshot({ path: 'evidence/faces-44px-grayscale.png' });
});

test('completion has one 600ms pulse and then remains static', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, almostWon());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  const banner = page.locator('.completion-banner');
  const timing = await banner.evaluate((node) => {
    const style = getComputedStyle(node);
    return { name: style.animationName, duration: style.animationDuration, iterations: style.animationIterationCount };
  });
  expect(timing).toEqual({ name: 'completion-pulse', duration: '0.6s', iterations: '1' });
  await expect.poll(() => banner.evaluate((node) => node.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
  expect(await banner.evaluate((node) => getComputedStyle(node).transform)).toBe('none');
  await expect(banner).toContainText('Completed in 8 moves');
});

test('reduced motion removes card transitions and the completion pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await cards(page).nth(0).evaluate((node) => getComputedStyle(node).transitionDuration)).toBe('0s');
  await loadSnapshot(page, almostWon());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  expect(await page.locator('.completion-banner').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
});
