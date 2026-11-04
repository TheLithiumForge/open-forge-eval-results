import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { finishedSnapshot, snapshotFromTextarea, uniqueFacePositions } from './fixtures.ts'

const colors = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice']
const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron']
const markers = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left']

test('renders all 128 named faces in the documented 44px grayscale sheet', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  const positions = uniqueFacePositions('np1-16-1')
  await snapshotFromTextarea(page, finishedSnapshot('np1-16-1', 128))
  await expect(page.locator('.card svg')).toHaveCount(256)
  const faces = await page.locator('.card').evaluateAll((cards, indexes) => indexes.map(({ index, faceId }) => {
    const card = cards[index]
    const svg = card?.querySelector('svg')
    return { faceId, svg: svg?.outerHTML ?? '', name: card?.getAttribute('aria-label') ?? '' }
  }), positions)
  expect(faces).toHaveLength(128)
  expect(faces.every((face) => face.svg.includes('viewBox="0 0 100 100"'))).toBe(true)
  expect(await page.locator('.card').nth(positions[0]?.index ?? 0).evaluate((card) => card.getBoundingClientRect().width)).toBe(44)
  for (const face of faces) {
    const expected = `${colors[Math.floor(face.faceId / 8) % 8]} ${face.faceId < 64 ? 'solid' : 'outline'} ${shapes[face.faceId % 8]}, marker ${markers[Math.floor(face.faceId / 8) % 8]}`
    expect(face.name).toContain(`${expected}, matched`)
  }

  await mkdir('evidence', { recursive: true })
  await page.evaluate((items) => {
    const styles = document.createElement('style')
    styles.textContent = 'body{margin:16px;background:#090B14;color:#F4F6FF;font:14px/20px system-ui,sans-serif}.face-sheet{display:grid;width:max-content;grid-template-columns:repeat(8,44px);gap:6px}.face-cell{display:grid;grid-template-rows:44px 12px;gap:4px;margin:0}.face-tile{box-sizing:border-box;width:44px;height:44px;border:2px solid #757C9A;border-radius:8px;background:#111625}.face-tile svg{display:block;width:100%;height:100%;filter:grayscale(1)}figcaption{text-align:center;font-size:10px;line-height:12px;color:#B8BDD2}'
    const sheet = document.createElement('main')
    sheet.className = 'face-sheet'
    for (const item of items) {
      const figure = document.createElement('figure')
      figure.className = 'face-cell'
      const tile = document.createElement('div')
      tile.className = 'face-tile'
      tile.innerHTML = item.svg
      const caption = document.createElement('figcaption')
      caption.textContent = String(item.faceId).padStart(3, '0')
      figure.append(tile, caption)
      sheet.append(figure)
    }
    document.body.replaceChildren(styles, sheet)
  }, faces)
  await page.screenshot({ path: 'evidence/faces-44-grayscale.png', fullPage: true })
  await expect(page.locator('.face-tile')).toHaveCount(128)
})
