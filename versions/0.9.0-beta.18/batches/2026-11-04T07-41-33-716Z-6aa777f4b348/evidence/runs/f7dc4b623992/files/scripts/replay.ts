import { readFile } from 'node:fs/promises'
import { replayGame } from '../src/game/replay.ts'
import { encodeSnapshot } from '../src/game/snapshot.ts'

const path = process.argv[2]

if (!path) {
  process.stderr.write('Invalid replay.\n')
  process.exitCode = 1
} else {
  try {
    const text = await readFile(path, 'utf8')
    const state = replayGame(text)
    if (!state) {
      process.stderr.write('Invalid replay.\n')
      process.exitCode = 1
    } else {
      process.stdout.write(`${encodeSnapshot(state)}\n`)
    }
  } catch {
    process.stderr.write('Invalid replay.\n')
    process.exitCode = 1
  }
}
