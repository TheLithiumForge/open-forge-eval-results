import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import { cards, loadBoard } from './helpers.ts';

test('real tab visibility pauses both clocks and preserves the exact remaining deadline', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'neon-pairs-visibility-'));
  // Playwright normally forces every tab to appear visible. Connect without
  // those overrides to exercise Chromium's actual visibility events.
  const child = spawn(chromium.executablePath(), ['--headless=new', '--no-sandbox',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
  try {
    const endpoint = await new Promise<string>((resolve, reject) => {
      child.stderr.on('data', (data: Buffer) => {
        const match = /DevTools listening on (ws:\/\/\S+)/.exec(data.toString());
        if (match?.[1]) resolve(match[1]);
      });
      child.once('error', reject);
      child.once('exit', () => reject(new Error('Visibility browser exited before connecting.')));
    });
    const browser = await chromium.connectOverCDP(endpoint, { noDefaults: true });
    try {
      const context = browser.contexts()[0];
      if (!context) throw new Error('Missing browser context');
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173');
      await loadBoard(page);
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await cards(page).nth(0).click(); await cards(page).nth(1).click();
      await page.clock.runFor(200);
      const other = await context.newPage();
      await other.bringToFront();
      expect(await page.evaluate(() => document.hidden)).toBe(true);
      await page.clock.runFor(2000);
      await expect(page.locator('.card.revealed')).toHaveCount(2);
      await page.bringToFront();
      expect(await page.evaluate(() => document.hidden)).toBe(false);
      await page.clock.runFor(599);
      await expect(page.locator('.card.revealed')).toHaveCount(2);
      await page.clock.runFor(1);
      await expect(page.locator('.card.revealed')).toHaveCount(0);
      await expect(page.locator('.scoreboard')).toContainText('Time: 0:00');
    } finally { await browser.close(); }
  } finally {
    const exited = new Promise<void>(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else child.once('exit', () => resolve()); });
    child.kill();
    await exited;
    await rm(profile, { recursive: true, force: true });
  }
});
