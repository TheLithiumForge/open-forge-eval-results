import { describe, expect, it } from 'vitest'
import { formatTime } from './time.ts'

describe('game clock display', () => {
  it('rounds down to seconds, pads seconds, and keeps counting minutes', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(999)).toBe('0:00')
    expect(formatTime(60000)).toBe('1:00')
    expect(formatTime(62000)).toBe('1:02')
    expect(formatTime(3600000)).toBe('60:00')
  })
})
