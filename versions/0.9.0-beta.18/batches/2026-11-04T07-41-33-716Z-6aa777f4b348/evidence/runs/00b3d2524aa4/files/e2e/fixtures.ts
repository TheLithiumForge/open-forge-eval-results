import { expect, type Page } from '@playwright/test'
import { createGame } from '../src/game/transitions.ts'

export type Pair = readonly [number, number]

export function pairsFor(code: string): Pair[] {
  const game = createGame(code)
  if (game === null) throw new Error(`Invalid test board code: ${code}`)
  const result: Pair[] = []
  for (let face = 0; face < game.board.deck.length / 2; face += 1) {
    const positions = game.board.deck.flatMap((value, index) => value === face ? [index] : [])
    const first = positions[0]
    const second = positions[1]
    if (first === undefined || second === undefined || positions.length !== 2) throw new Error(`Face ${face} must form one pair`)
    result.push([first, second])
  }
  return result
}

export function uniqueFacePositions(code: string): { faceId: number; index: number }[] {
  const game = createGame(code)
  if (game === null) throw new Error(`Invalid test board code: ${code}`)
  const seen = new Set<number>()
  return game.board.deck.flatMap((faceId, index) => {
    if (seen.has(faceId)) return []
    seen.add(faceId)
    return [{ faceId, index }]
  }).sort((first, second) => first.faceId - second.faceId)
}

export async function openReproduction(page: Page): Promise<void> {
  const panel = page.locator('details.reproduction-panel')
  if (await panel.getAttribute('open') === null) await panel.locator('summary').click()
}

export async function loadBoard(page: Page, code: string): Promise<void> {
  await openReproduction(page)
  await page.getByLabel('Board code').fill(code)
  await page.getByRole('button', { name: 'Load board' }).click()
  await expect(page.locator('.reproduction-status')).toHaveText('Board loaded.')
}

export function finishedSnapshot(code: string, moves: number, elapsedMs = 2300): string {
  const pairs = pairsFor(code)
  return JSON.stringify({
    version: 1,
    boardCode: code,
    matched: pairs.flatMap(([first, second]) => [first, second]),
    selection: { kind: 'closed' },
    moves,
    elapsedMs,
    started: true,
  })
}

export function mismatchSnapshot(code: string, remainingMs = 300, elapsedMs = 1000): string {
  const pairs = pairsFor(code)
  const [firstPair, secondPair] = pairs
  if (firstPair === undefined || secondPair === undefined) throw new Error('Two face pairs are required')
  const first = firstPair[0]
  const differentFace = secondPair[0]
  return JSON.stringify({
    version: 1,
    boardCode: code,
    matched: [],
    selection: { kind: 'mismatch', first, second: differentFace, remainingMs },
    moves: 1,
    elapsedMs,
    started: true,
  })
}

export function unfinishedSnapshot(code: string): string {
  const pairs = pairsFor(code)
  const finalPair = pairs[pairs.length - 1]
  if (finalPair === undefined) throw new Error('Final face pair must exist')
  return JSON.stringify({
    version: 1,
    boardCode: code,
    matched: pairs.slice(0, -1).flatMap(([first, second]) => [first, second]),
    selection: { kind: 'one', index: finalPair[0] },
    moves: pairs.length - 1,
    elapsedMs: 1500,
    started: true,
  })
}

export async function activatePairsWithMouse(page: Page, pairs: readonly Pair[]): Promise<void> {
  await page.evaluate((positions) => {
    const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.card'))
    for (const [first, second] of positions) {
      const firstCard = cards[first]
      const secondCard = cards[second]
      if (firstCard === undefined || secondCard === undefined) throw new Error('Expected board card')
      firstCard.click()
      secondCard.click()
    }
  }, pairs)
}

export async function snapshotFromTextarea(page: Page, value: string): Promise<void> {
  await openReproduction(page)
  await page.getByLabel('Snapshot JSON').fill(value)
  await page.getByRole('button', { name: 'Load snapshot' }).click()
}
