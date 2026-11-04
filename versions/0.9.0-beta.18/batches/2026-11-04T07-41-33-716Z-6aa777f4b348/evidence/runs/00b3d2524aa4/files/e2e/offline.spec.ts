import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'

test('opens the built single-file game from disk while offline', async ({ browser }) => {
  const html = await readFile(resolve('dist/index.html'), 'utf8')
  expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(1048576)
  expect(html).not.toMatch(/(?:src|href)=["'](?:https?:)?\/\//i)
  expect(html).not.toMatch(/<(?:audio|video)\b|AudioContext|webkitAudioContext/i)
  const context = await browser.newContext({ offline: true })
  try {
    const page = await context.newPage()
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))
    await page.route('**/*', async (route) => {
      if (route.request().url().startsWith('file:')) await route.continue()
      else await route.abort()
    })
    await page.goto(pathToFileURL(resolve('dist/index.html')).href)
    await expect(page.locator('.card')).toHaveCount(16)
    await page.locator('.card').nth(0).click()
    await expect(page.locator('.card').nth(0)).toHaveAttribute('aria-label', /revealed$/)
    await page.getByRole('button', { name: 'New Game' }).click()
    await expect(page.getByText('Moves: 0')).toBeVisible()
    expect(requests.every((url) => url.startsWith('file:'))).toBe(true)
  } finally {
    await context.close()
  }
})
