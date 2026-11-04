import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('replay command', () => {
  it('prints only a final snapshot for valid input and rejects invalid files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'neon-pairs-'))
    try {
      const validPath = join(directory, 'valid.json')
      const invalidPath = join(directory, 'invalid.json')
      await writeFile(validPath, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}')
      await writeFile(invalidPath, '{"version":2}')
      const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', validPath], { cwd: resolve('.'), encoding: 'utf8' })
      expect(valid.status).toBe(0)
      expect(valid.stderr).toBe('')
      expect(valid.stdout).toBe('{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"closed"},"moves":1,"elapsedMs":800,"started":true}\n')
      const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', invalidPath], { cwd: resolve('.'), encoding: 'utf8' })
      expect(invalid.status).not.toBe(0)
      expect(invalid.stdout).toBe('')
      expect(invalid.stderr.length).toBeGreaterThan(0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
