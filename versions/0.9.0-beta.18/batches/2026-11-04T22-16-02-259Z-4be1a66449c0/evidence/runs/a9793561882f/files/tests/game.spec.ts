import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const file = pathToFileURL(resolve('dist/index.html')).href;
const deck = [6,7,0,5,2,2,0,5,3,7,1,6,4,4,1,3];
async function loadBoard(page: import('@playwright/test').Page) {
  await page.getByText('Reproduce a game').click(); await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button', {name:'Load board'}).click();
}
test('offline keyboard game and accessibility tree', async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(file); await loadBoard(page);
  const cards = page.locator('.card'); await expect(cards).toHaveCount(16); await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.locator('.card svg path')).toHaveCount(16);
  await cards.first().focus(); await page.keyboard.press('ArrowRight'); await expect(cards.nth(1)).toBeFocused(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
  await expect(cards.first()).toHaveAccessibleName(/revealed/);
  await cards.nth(11).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('status')).toHaveText('Pair found. 1 pair matched.');
  expect(await page.locator('body').ariaSnapshot()).toContain('Grid size'); await expect(cards.first()).toHaveAttribute('aria-disabled','true');
  for (let face = 0; face < 6; face++) { const positions = deck.map((value, index) => value === face ? index : -1).filter(index => index >= 0); for (const index of positions) { await cards.nth(index).focus(); await page.keyboard.press('Enter'); } }
  for (const index of [1,9]) { await cards.nth(index).focus(); await page.keyboard.press('Enter'); }
  await expect(page.getByRole('status')).toContainText('All pairs found in 8 moves'); await expect(page.getByText(/All pairs found!/)).toBeVisible();
  await page.keyboard.press('Tab'); await expect(page.getByText('Reproduce a game')).toBeFocused();
  await page.getByRole('button',{name:'New Game'}).click(); await expect(page.getByText('Moves: 0')).toBeVisible();
});
test('snapshots, focus, and mismatch reset', async ({ page }) => {
  await page.goto(file); await loadBoard(page); const cards = page.locator('.card');
  await cards.nth(0).click(); await cards.nth(1).click(); await page.getByRole('button',{name:'Restart'}).click(); await cards.nth(2).click(); await page.waitForTimeout(900); await expect(cards.nth(2)).toHaveAccessibleName(/revealed/);
  await page.getByRole('button',{name:'Export snapshot'}).click(); const saved = await page.getByLabel('Snapshot JSON').inputValue(); expect(JSON.parse(saved).selection.index).toBe(2);
  await page.getByRole('button',{name:'Load snapshot'}).click(); await expect(page.getByText('Loaded snapshot. Select Resume to continue.')).toBeVisible(); await cards.nth(3).click(); await expect(page.getByText('Moves: 0')).toBeVisible();
  await page.getByRole('button',{name:'Resume'}).click(); await expect(cards.nth(3)).toBeFocused(); await page.getByLabel('Board code').fill('invalid'); await page.getByRole('button',{name:'Load board'}).click(); await expect(page.getByText('Invalid board code.')).toBeVisible();
});
test('large board fits viewport and keyboard reaches last card', async ({page}) => {
  await page.setViewportSize({width:360,height:800}); await page.goto(file); await page.getByLabel('Grid size').selectOption('16'); const cards = page.locator('.card'); await expect(cards).toHaveCount(256);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect((await cards.first().boundingBox())?.width).toBeGreaterThanOrEqual(44);
  await cards.first().focus(); for(let i=0;i<15;i++) await page.keyboard.press('ArrowRight'); for(let i=0;i<15;i++) await page.keyboard.press('ArrowDown'); await expect(cards.last()).toBeFocused();
});
test('preferences survive a reload over HTTP', async ({page}) => {
  const html = readFileSync(resolve('dist/index.html')); const server = createServer((_req,res) => { res.writeHead(200,{'Content-Type':'text/html'}); res.end(html); });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('server');
  try { await page.goto(`http://127.0.0.1:${address.port}`); await page.getByLabel('Grid size').selectOption('6'); await page.reload(); await expect(page.getByLabel('Grid size')).toHaveValue('6'); } finally { server.close(); }
});
test('paused mismatch and completed imports preserve local best', async ({page}) => {
  const html = readFileSync(resolve('dist/index.html')); const server = createServer((_req,res) => { res.writeHead(200,{'Content-Type':'text/html'}); res.end(html); });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('server');
  try {
    await page.goto(`http://127.0.0.1:${address.port}`); await page.evaluate(() => localStorage.setItem('neon-pairs-best', '{"4":20}')); await page.reload();
    await page.getByText('Reproduce a game').click(); const textarea = page.getByLabel('Snapshot JSON');
    await textarea.fill(JSON.stringify({version:1,boardCode:'np1-4-1',matched:[0,11],selection:{kind:'mismatch',first:1,second:2,remainingMs:300},moves:2,elapsedMs:1500,started:true}));
    await page.getByRole('button',{name:'Load snapshot'}).click(); await page.waitForTimeout(500); const cards = page.locator('.card'); await expect(cards.nth(1)).toHaveAccessibleName(/revealed/);
    await page.getByRole('button',{name:'Resume'}).click(); await page.waitForTimeout(500); await expect(cards.nth(1)).toHaveAccessibleName(/closed/);
    await textarea.fill(JSON.stringify({version:1,boardCode:'np1-4-1',matched:Array.from({length:16},(_,i)=>i),selection:{kind:'closed'},moves:8,elapsedMs:9000,started:true}));
    await page.getByRole('button',{name:'Load snapshot'}).click(); await expect(page.getByText('Loaded completed snapshot.')).toBeVisible(); await expect(page.getByText('Best: 20')).toBeVisible(); await expect(page.locator('.win')).not.toHaveClass(/pulse/);
    await page.reload(); await expect(page.getByText('Best: 20')).toBeVisible();
  } finally { server.close(); }
});
test('wide and zoom-equivalent layouts keep the page in view', async ({page}) => {
  for (const viewport of [{width:1280,height:800},{width:640,height:400}]) {
    await page.setViewportSize(viewport); await page.goto(file); await page.getByLabel('Grid size').selectOption('16');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.card')).toHaveCount(256); await page.locator('.card').last().focus();
    expect(await page.locator('.card').last().evaluate(el => { const a=el.getBoundingClientRect(), b=el.closest('.board-scroll')?.getBoundingClientRect(); return !!b && a.left >= b.left + 5 && a.right <= b.right - 5 && a.top >= b.top + 5 && a.bottom <= b.bottom - 5; })).toBe(true);
  }
});
test('resumed wins save only better best scores', async ({page}) => {
  const html = readFileSync(resolve('dist/index.html')); const server = createServer((_req,res) => { res.writeHead(200,{'Content-Type':'text/html'}); res.end(html); });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('server');
  try {
    await page.goto(`http://127.0.0.1:${address.port}`); await page.evaluate(() => localStorage.setItem('neon-pairs-best', '{"4":12}')); await page.reload(); await page.getByText('Reproduce a game').click();
    for (const [moves, best] of [[13,12],[11,12],[9,10]]) {
      await page.getByLabel('Snapshot JSON').fill(JSON.stringify({version:1,boardCode:'np1-4-1',matched:Array.from({length:16},(_,i)=>i).filter(i=>i!==0 && i!==11),selection:{kind:'one',index:0},moves,elapsedMs:1000,started:true}));
      await page.getByRole('button',{name:'Load snapshot'}).click(); await page.getByRole('button',{name:'Resume'}).click(); await page.locator('.card').nth(11).click(); await expect(page.getByText(`Best: ${best}`, {exact:true})).toBeVisible();
    }
    await page.reload(); await expect(page.getByText('Best: 10')).toBeVisible();
  } finally { server.close(); }
});
