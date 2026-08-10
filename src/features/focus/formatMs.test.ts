import { describe, expect, it } from 'vitest'
import { formatMs } from './formatMs'

describe('formatMs', () => {
  it.each([[1_500_000, '25:00'], [90_000, '01:30'], [1, '00:01'], [0, '00:00']])('formats %i milliseconds as %s', (input, expected) => {
    expect(formatMs(input)).toBe(expected)
  })
})
