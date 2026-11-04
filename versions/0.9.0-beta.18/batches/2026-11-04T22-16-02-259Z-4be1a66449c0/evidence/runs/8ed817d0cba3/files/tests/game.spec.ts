import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const deck = [6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3];
test('offline file supports keyboard play and accessible completion', async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', {name:'Neon Pairs'})).toBeVisible();
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button', {name:'Load board'}).click();
  const cards = page.locator('.card'); await expect(cards).toHaveCount(16);
  await expect(cards.nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards.nth(0).locator('svg')).toHaveCount(0);
  const cdp = await page.context().newCDPSession(page);
  const tree = await cdp.send('Accessibility.getFullAXTree');
  expect(tree.nodes.some(node => node.role?.value === 'combobox' && node.name?.value === 'Grid size')).toBe(true);
  expect(tree.nodes.some(node => node.role?.value === 'button' && node.name?.value === 'Row 1, column 1, closed')).toBe(true);
  await cards.nth(0).focus(); await page.keyboard.press('ArrowRight'); await expect(cards.nth(1)).toBeFocused();
  let position = 1;
  async function navigate(target: number) {
    while (Math.floor(position / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); position += 4; }
    while (Math.floor(position / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); position -= 4; }
    while (position % 4 < target % 4) { await page.keyboard.press('ArrowRight'); position++; }
    while (position % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); position--; }
  }
  for (let face = 0; face < 8; face++) {
    const a = deck.indexOf(face), b = deck.lastIndexOf(face);
    await navigate(a); await page.keyboard.press('Enter');
    if (face === 0) {
      const revealedTree = await cdp.send('Accessibility.getFullAXTree');
      expect(revealedTree.nodes.some(node => node.role?.value === 'button' && String(node.name?.value).includes('cyan solid circle, marker top, revealed'))).toBe(true);
    }
    await navigate(b); await page.keyboard.press('Space');
  }
  await expect(page.getByText('All pairs found!', {exact:false})).toBeVisible();
  await expect(page.locator('[aria-live]')).toContainText('All pairs found in 8 moves');
  await expect(cards.nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Best:', {exact:false})).toContainText('8');
  const completedTree = await cdp.send('Accessibility.getFullAXTree');
  expect(completedTree.nodes.some(node => String(node.name?.value).includes('All pairs found in 8 moves'))).toBe(true);
  await page.keyboard.press('Tab'); await expect(page.getByText('Reproduce a game')).toBeFocused();
  await page.getByRole('button', {name:'New Game'}).focus(); await page.keyboard.press('Enter');
  await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed');
});
test('served storage and snapshot pause survive reload and respect focus', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Grid size').selectOption('6'); await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({version:1,boardCode:'np1-4-1',matched:[0,11],selection:{kind:'mismatch',first:1,second:2,remainingMs:300},moves:2,elapsedMs:1500,started:true}));
  await page.getByRole('button',{name:'Load snapshot'}).click();
  await expect(page.locator('.repro-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.waitForTimeout(400); await expect(page.locator('.card').nth(1)).toHaveAccessibleName(/revealed/);
  await page.getByRole('button',{name:'Resume'}).click(); await expect(page.locator('.card').first()).toBeFocused();
  await expect(page.locator('.card').nth(1)).toHaveAccessibleName(/closed/, {timeout:1500});
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
});

for (const viewport of [{width:360,height:800},{width:1280,height:800},{width:640,height:400}]) {
  test(`large board fits ${viewport.width} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/');
    await page.getByLabel('Grid size').selectOption('16');
    const cards = page.locator('.card'); await expect(cards).toHaveCount(256);
    const metrics = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(metrics.page).toBeLessThanOrEqual(metrics.viewport);
    const box = await cards.first().boundingBox(); expect(box?.width).toBeGreaterThanOrEqual(44); expect(box?.height).toBeGreaterThanOrEqual(44);
    await cards.last().focus(); await expect(cards.last()).toBeFocused();
  });
}
