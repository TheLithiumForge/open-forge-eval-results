import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

test('the built single HTML game plays from disk with network offline', async ({ browser }) => {
  const context = await browser.newContext()
  await context.setOffline(true)
  const page = await context.newPage()
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto(pathToFileURL(resolve('dist/index.html')).href)
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible()
  await expect(page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')).toHaveCount(16)
  await page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button').nth(0).click()
  await expect(page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button').nth(0)).toHaveAttribute('aria-label', /revealed$/u)
  expect(await page.evaluate(() => document.location.protocol)).toBe('file:')
  expect(requests.filter((url) => /^https?:/u.test(url))).toEqual([])
  await context.close()
})

test('the built game uses inline art and does not include audio controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('svg')).toHaveCount(16)
  await expect(page.locator('canvas, audio, video')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /sound|mute|audio/iu })).toHaveCount(0)
})
