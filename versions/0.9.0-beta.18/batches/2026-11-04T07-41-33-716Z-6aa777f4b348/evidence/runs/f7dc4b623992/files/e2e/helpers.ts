import { activateCard, createGame } from '../src/game/game.ts'
import { createDeck } from '../src/game/board.ts'
import { faceData } from '../src/game/board/face.ts'
import { encodeSnapshot } from '../src/game/snapshot.ts'
import type { Page } from '@playwright/test'

export function boardPairs(boardCode: string): Array<[number, number]> {
  const deck = createDeck(boardCode)
  if (!deck) throw new Error(`Invalid board fixture: ${boardCode}`)
  const positions = new Map<number, number[]>()
  deck.forEach((face, index) => positions.set(face, [...(positions.get(face) ?? []), index]))
  return [...positions.values()].map(([first, second]) => {
    if (first === undefined || second === undefined) throw new Error('Fixture face must occur twice')
    return [first, second]
  })
}

export function faceNamesByPosition(boardCode: string): string[] {
  const deck = createDeck(boardCode)
  if (!deck) throw new Error(`Invalid board fixture: ${boardCode}`)
  return deck.map((face) => faceData(face).name)
}

export async function finishCurrentDeal(page: Page, boardCode: string): Promise<void> {
  const size = Number(boardCode.split('-')[1])
  const cards = page.getByRole('group', { name: `${size} by ${size} card board` }).getByRole('button')
  for (const [first, second] of boardPairs(boardCode)) {
    await cards.nth(first).click()
    await cards.nth(second).click()
  }
}

export function snapshotWithOneReveal(boardCode = 'np1-4-1'): string {
  const game = createGame(boardCode)
  if (!game) throw new Error(`Invalid board fixture: ${boardCode}`)
  const state = activateCard(game, 0)
  return encodeSnapshot(state)
}

export function snapshotWithMismatch(boardCode = 'np1-4-1', remainingMs = 800): string {
  const game = createGame(boardCode)
  if (!game) throw new Error(`Invalid board fixture: ${boardCode}`)
  const state = activateCard(activateCard(game, 0), 1)
  if (state.selection.kind !== 'mismatch') throw new Error('Fixture cards must mismatch')
  return encodeSnapshot({ ...state, selection: { ...state.selection, remainingMs } })
}

export function completedSnapshot(boardCode = 'np1-4-1', moves?: number): string {
  const game = createGame(boardCode)
  if (!game) throw new Error(`Invalid board fixture: ${boardCode}`)
  const matched = game.deck.map((_, index) => index)
  return encodeSnapshot({ ...game, matched, moves: moves ?? matched.length / 2, elapsedMs: 1_250, started: true })
}

export async function openReproduction(page: import('@playwright/test').Page): Promise<void> {
  if (await page.locator('details.reproduction').getAttribute('open') === null) {
    await page.getByText('Reproduce a game', { exact: true }).click()
  }
}

export async function loadBoard(page: import('@playwright/test').Page, code = 'np1-4-1'): Promise<void> {
  await openReproduction(page)
  await page.getByLabel('Board code').fill(code)
  await page.getByRole('button', { name: 'Load board' }).click()
}

export async function captureAnnouncements(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const log: string[] = []
    let last = ''
    const observer = new MutationObserver(() => {
      const text = document.querySelector('[role="status"]')?.textContent?.trim() ?? ''
      if (text && text !== last) log.push(text)
      last = text
      document.documentElement?.setAttribute('data-test-announcements', JSON.stringify(log))
    })
    observer.observe(document, { childList: true, subtree: true, characterData: true })
  })
}

export async function installTestClock(page: import('@playwright/test').Page): Promise<void> {
  await page.clock.install({ time: new Date('2024-01-01T00:00:00Z') })
}

export async function pauseTestClock(page: import('@playwright/test').Page): Promise<void> {
  await page.clock.pauseAt(new Date('2024-01-01T01:00:00Z'))
}
