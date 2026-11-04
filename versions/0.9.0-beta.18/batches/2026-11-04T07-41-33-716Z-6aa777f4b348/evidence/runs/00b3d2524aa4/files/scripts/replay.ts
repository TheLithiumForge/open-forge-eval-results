import { readFile } from 'node:fs/promises'
import { replayGame } from '../src/game/replay.ts'
import { encodeSnapshot } from '../src/game/snapshot.ts'

async function main(): Promise<void> {
  const path = process.argv[2]
  if (process.argv.length !== 3 || path === undefined) {
    console.error('Invalid replay.')
    process.exitCode = 1
    return
  }
  try {
    const text = await readFile(path, 'utf8')
    const result = replayGame(text)
    if (result === null) {
      console.error('Invalid replay.')
      process.exitCode = 1
      return
    }
    console.log(encodeSnapshot(result))
  } catch {
    console.error('Invalid replay.')
    process.exitCode = 1
  }
}

await main()
