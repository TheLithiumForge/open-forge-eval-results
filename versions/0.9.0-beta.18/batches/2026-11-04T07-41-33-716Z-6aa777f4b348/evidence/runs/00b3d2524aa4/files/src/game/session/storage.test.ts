import { afterEach, describe, expect, it, vi } from 'vitest'
import { readPreferences, withBest, withSize, writePreferences } from './storage.ts'

afterEach(() => vi.unstubAllGlobals())

describe('saved preferences', () => {
  it('validates supported sizes and finite capped integer bests', () => {
    const data = JSON.stringify({ version: 1, size: 6, bests: { 4: 0, 6: 999999, 8: 1.5, 10: -1, 12: 1000000, 14: '8', 16: 12 } })
    vi.stubGlobal('window', { localStorage: { getItem: () => data, setItem: () => undefined } })
    expect(readPreferences()).toEqual({ size: 6, bests: { 4: 0, 6: 999999, 16: 12 } })
    const invalid = JSON.stringify({ version: 1, size: 5, bests: { 4: Infinity } })
    vi.stubGlobal('window', { localStorage: { getItem: () => invalid, setItem: () => undefined } })
    expect(readPreferences()).toEqual({ size: 4, bests: {} })
  })

  it('keeps a best only when the result is strictly better', () => {
    const preferences = { size: 4 as const, bests: { 4: 8 } }
    expect(withBest(preferences, 4, 9)).toBe(preferences)
    expect(withBest(preferences, 4, 8)).toBe(preferences)
    expect(withBest(preferences, 4, 7).bests[4]).toBe(7)
    expect(withSize(preferences, 6).size).toBe(6)
  })

  it('catches unavailable reads and writes without touching unrelated keys', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } } })
    expect(readPreferences()).toEqual({ size: 4, bests: {} })
    writePreferences(readPreferences())

    const entries = new Map<string, string>([['other-tool', 'kept']])
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value) },
    } })
    writePreferences({ size: 6, bests: { 4: 7 } })
    expect(entries.get('other-tool')).toBe('kept')
    expect(entries.get('neon-pairs.preferences.v1')).toBe('{"version":1,"size":6,"bests":{"4":7}}')
  })
})
