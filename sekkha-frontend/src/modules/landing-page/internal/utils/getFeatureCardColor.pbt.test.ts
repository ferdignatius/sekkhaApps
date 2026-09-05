import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { getFeatureCardColor, type FeatureCardColor } from './getFeatureCardColor'

/**
 * Validates: Requirements 4.4
 *
 * Property 2: Feature Card Color Cycling
 */

const COLOR_CYCLE: FeatureCardColor[] = ['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream']

describe('getFeatureCardColor - Property 2: Feature Card Color Cycling', () => {
  it('should return COLOR_CYCLE[i % 6] for any valid index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (i) => {
          expect(getFeatureCardColor(i)).toBe(COLOR_CYCLE[i % 6])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should never return the same color for two consecutive indices', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        (i) => {
          expect(getFeatureCardColor(i)).not.toBe(getFeatureCardColor(i + 1))
        }
      ),
      { numRuns: 100 }
    )
  })
})
