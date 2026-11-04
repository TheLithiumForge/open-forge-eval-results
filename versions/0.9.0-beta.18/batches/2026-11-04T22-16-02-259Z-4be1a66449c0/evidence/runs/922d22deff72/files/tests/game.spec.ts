import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const deck = [6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3];
test('offline game, keyboard journey and accessible names', async ({ page, context }) => {
  await context.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await page.getByText('Reproduce a game').click(); await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button', {name:'Load board'}).click();
  const cards = page.locator('.card'); await expect(cards).toHaveCount(16); await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed'); await expect(cards.first().locator('svg')).toHaveCount(0);
  await cards.first().focus(); await page.keyboard.press('ArrowRight'); await expect(cards.nth(1)).toBeFocused(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter'); await expect(cards.first()).toHaveAccessibleName(/revealed/);
  await cards.nth(11).click(); await expect(page.getByText('Pairs:').locator('..')).toContainText('1/8');
  for (let face = 0; face < 8; face++) { if (face === 6) continue; const indices = deck.flatMap((f, i) => f === face ? [i] : []); await cards.nth(indices[0]!).click(); await cards.nth(indices[1]!).click(); }
  await expect(page.getByText('All pairs found!', {exact:true})).toBeVisible(); await expect(page.locator('[aria-live]')).toContainText('All pairs found in 8 moves');
  await page.getByRole('button',{name:'Restart'}).click(); await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed');
});
test('snapshot pauses and preferences persist on HTTP', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173'); await page.getByLabel('Grid size').selectOption('6'); await page.reload(); await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByText('Reproduce a game').click(); await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button',{name:'Load board'}).click();
  const cards = page.locator('.card'); await cards.nth(0).click(); await cards.nth(1).click(); await page.getByRole('button',{name:'Export snapshot'}).click();
  const saved = await page.getByLabel('Snapshot JSON').inputValue(); await page.getByRole('button',{name:'Load snapshot'}).click(); await expect(page.locator('.load-status')).toBeVisible();
  await page.waitForTimeout(900); await expect(cards.nth(0)).toHaveAccessibleName(/revealed/); await page.getByRole('button',{name:'Resume'}).click(); await expect(cards.nth(0)).toBeFocused(); await expect(cards.nth(0)).toHaveAccessibleName(/closed/, {timeout:1500}); expect(JSON.parse(saved).version).toBe(1);
});

test('complete game by keyboard with accessible status and saved best', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await expect(page.getByLabel('Grid size')).toHaveAccessibleName('Grid size');
  await expect(page.getByRole('button', {name:'New Game'})).toBeVisible();
  await page.getByText('Reproduce a game').click(); await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button',{name:'Load board'}).click();
  const cards = page.locator('.card'); let position = 0; await cards.first().focus();
  async function navigate(target: number) {
    while (Math.floor(position / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); position += 4; }
    while (Math.floor(position / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); position -= 4; }
    while (position % 4 < target % 4) { await page.keyboard.press('ArrowRight'); position++; }
    while (position % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); position--; }
    await expect(cards.nth(target)).toBeFocused();
  }
  for (let face = 0; face < 8; face++) {
    const positions = deck.flatMap((f, i) => f === face ? [i] : []);
    for (const index of positions) { await navigate(index); await expect(cards.nth(index)).toHaveAccessibleName(/closed/); await page.keyboard.press('Enter'); }
    await expect(cards.nth(positions[0]!)).toHaveAttribute('aria-disabled','true');
  }
  await expect(page.getByText('All pairs found!', {exact:true})).toBeVisible();
  await expect(page.locator('[aria-live]')).toContainText('All pairs found in 8 moves', { timeout: 5000 });
  const statusTree = await page.getByLabel('Game status').ariaSnapshot(); expect(statusTree).toContain('Moves:'); expect(statusTree).toContain('strong: "8"');
  await page.keyboard.press('Tab'); await expect(page.getByText('Reproduce a game')).toBeFocused();
  await page.reload(); await expect(page.getByLabel('Game status')).toContainText('Best: 8');
});
for (const viewport of [{width:360,height:800},{width:1280,height:800},{width:640,height:400}]) {
  test(`large board stays contained at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('http://127.0.0.1:4173'); await page.getByLabel('Grid size').selectOption('16');
    const cards = page.locator('.card'); await expect(cards).toHaveCount(256);
    const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth, card: document.querySelector('.card')?.getBoundingClientRect().width ?? 0 }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport); expect(dimensions.card).toBeGreaterThanOrEqual(44);
    await cards.last().focus(); await expect(cards.last()).toBeFocused();
    const visible = await cards.last().evaluate(el => { const card = el.getBoundingClientRect(), board = el.closest('.board-scroll')?.getBoundingClientRect(); return !!board && card.left - 2 >= board.left && card.right + 2 <= board.right && card.top - 2 >= board.top && card.bottom + 2 <= board.bottom; });
    expect(visible).toBe(true);
  });
}
