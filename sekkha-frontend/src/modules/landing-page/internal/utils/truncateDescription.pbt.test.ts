import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { truncateDescription } from './truncateDescription'

/**
 * **Validates: Requirements 4.6**
 *
 * Property 3: Description Truncation
 */
describe('truncateDescription - Property 3: Description Truncation', () => {
  it('should return the original text when length <= 120, or truncate to 121 chars ending with "…" when length > 120', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = truncateDescription(text)

        if (text.length <= 120) {
          expect(result).toBe(text)
        } else {
          expect(result).toHaveLength(121)
          expect(result.endsWith('…')).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })
})
