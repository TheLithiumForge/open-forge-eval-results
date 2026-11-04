import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const html = resolve('dist/index.html');
const pairs = [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]];
async function loadBoard(page: import('@playwright/test').Page) {
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button',{name:'Load board'}).click();
}
test('offline keyboard game exposes names and turn results', async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(pathToFileURL(html).href);
  await loadBoard(page);
  const board = page.getByRole('group',{name:'Game board'}), cards = board.getByRole('button');
  await expect(cards).toHaveCount(16);
  await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards.first().locator('svg')).toHaveCount(0);
  await cards.first().focus();
  await page.keyboard.press('Enter');
  await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toHaveText('Pair found. 1 pair matched.');
  for (const pair of pairs.slice(1)) { await cards.nth(pair[0]!).click(); await cards.nth(pair[1]!).click(); }
  await expect(page.getByText('All pairs found!',{exact:false})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('All pairs found in 8 moves');
  await page.keyboard.press('Tab');
  await expect(board.getByRole('button').filter({has: page.locator(':focus')})).toHaveCount(0);
});
test('snapshot pause, restart and large board layout', async ({ page }) => {
  await page.setViewportSize({width:360,height:800}); await page.goto(pathToFileURL(html).href); await loadBoard(page);
  const snapshot = {version:1,boardCode:'np1-4-1',matched:[0,11],selection:{kind:'mismatch',first:1,second:2,remainingMs:300},moves:2,elapsedMs:1500,started:true};
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(snapshot)); await page.getByRole('button',{name:'Load snapshot'}).click();
  const cards = page.getByRole('group',{name:'Game board'}).getByRole('button');
  await cards.nth(3).click(); await page.waitForTimeout(400); await expect(cards.nth(1)).toHaveAccessibleName(/revealed/);
  await page.getByRole('button',{name:'Resume'}).click(); await page.waitForTimeout(400); await expect(cards.nth(1)).toHaveAccessibleName(/closed/);
  await page.getByLabel('Grid size').selectOption('16'); await expect(cards).toHaveCount(256);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await cards.first().boundingBox(); expect(box?.width).toBeGreaterThanOrEqual(44);
});
test('best scores persist on an HTTP origin', async ({ page }) => {
  const server = createServer((_req,res) => {res.writeHead(200,{'Content-Type':'text/html'});res.end(readFileSync(html));});
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw Error('server');
    await page.goto(`http://127.0.0.1:${address.port}`); await loadBoard(page);
    const cards = page.getByRole('group',{name:'Game board'}).getByRole('button');
    for (const pair of pairs) { await cards.nth(pair[0]!).click(); await cards.nth(pair[1]!).click(); }
    await expect(page.getByText('Best:')).toContainText('8'); await page.reload(); await expect(page.getByText('Best:')).toContainText('8');
  } finally { server.close(); }
});
test('keyboard-only completion has an accessible tree and native tab exit', async ({ page }) => {
  await page.goto(pathToFileURL(html).href); await loadBoard(page);
  await page.getByText('Reproduce a game').click();
  await page.getByRole('button',{name:'Restart'}).focus(); await page.keyboard.press('Tab');
  const board = page.getByRole('group',{name:'Game board'}), cards = board.getByRole('button');
  await expect(cards.first()).toBeFocused();
  const cdp = await page.context().newCDPSession(page);
  const tree = await cdp.send('Accessibility.getFullAXTree');
  const names = tree.nodes.map(node => node.name?.value);
  expect(names).toContain('Grid size'); expect(names).toContain('New Game'); expect(names).toContain('Row 1, column 1, closed');
  let current = 0;
  async function move(target: number) {
    while (Math.floor(current / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
    while (Math.floor(current / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
    while (current % 4 < target % 4) { await page.keyboard.press('ArrowRight'); current++; }
    while (current % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); current--; }
    await page.keyboard.press('Enter');
  }
  for (const pair of pairs) { await move(pair[0]!); await move(pair[1]!); }
  await expect(page.getByRole('status')).toContainText('All pairs found in 8 moves');
  const completeTree = await cdp.send('Accessibility.getFullAXTree');
  expect(completeTree.nodes.some(node => String(node.name?.value).includes('matched'))).toBe(true);
  expect(completeTree.nodes.some(node => String(node.name?.value).includes('All pairs found'))).toBe(true);
  await page.keyboard.press('Tab'); await expect(page.getByText('Reproduce a game')).toBeFocused();
  await page.getByRole('button',{name:'New Game'}).click(); await expect(page.getByText('Moves:')).toContainText('0');
});
test('large boards keep focus visible at phone and zoom-equivalent sizes', async ({ page }) => {
  for (const viewport of [{width:360,height:800},{width:1280,height:800},{width:640,height:400}]) {
    await page.setViewportSize(viewport); await page.goto(pathToFileURL(html).href);
    await page.getByLabel('Grid size').selectOption('16');
    const board = page.locator('.board-scroll'), cards = board.getByRole('button');
    await cards.first().focus();
    for (let i=0;i<15;i++) await page.keyboard.press('ArrowRight');
    for (let i=0;i<15;i++) await page.keyboard.press('ArrowDown');
    await expect(cards.last()).toBeFocused();
    const scroll = await board.boundingBox(), card = await cards.last().boundingBox();
    if (!scroll || !card) throw Error('Missing board bounds');
    expect(card.x - 5).toBeGreaterThanOrEqual(scroll.x); expect(card.y - 5).toBeGreaterThanOrEqual(scroll.y);
    expect(card.x + card.width + 5).toBeLessThanOrEqual(scroll.x + scroll.width); expect(card.y + card.height + 5).toBeLessThanOrEqual(scroll.y + scroll.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test('invalid drafts preserve play and restarting cancels an earlier mismatch', async ({ page }) => {
  await page.goto(pathToFileURL(html).href); await loadBoard(page);
  const cards = page.getByRole('group',{name:'Game board'}).getByRole('button');
  await cards.nth(0).click(); await cards.nth(1).click();
  await page.getByLabel('Board code').fill('invalid'); await page.getByRole('button',{name:'Load board'}).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.'); await expect(page.getByText('Moves:')).toContainText('1');
  await expect(page.getByLabel('Board code')).toHaveValue('invalid');
  await page.getByRole('button',{name:'Restart'}).click(); await cards.nth(2).click();
  await page.waitForTimeout(900); await expect(cards.nth(2)).toHaveAccessibleName(/revealed/);
  await page.getByLabel('Snapshot JSON').fill('{bad'); await page.getByRole('button',{name:'Load snapshot'}).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.'); await expect(cards.nth(2)).toHaveAccessibleName(/revealed/);
});
