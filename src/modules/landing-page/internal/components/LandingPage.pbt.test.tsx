/**
 * Property-Based Tests for LandingPage DOM structural invariants.
 *
 * **Validates: Requirements 9.2, 9.7**
 *
 * Requirement 9.2: THE Landing_Page SHALL memiliki satu elemen `<h1>` yang
 *   merepresentasikan headline utama Hero_Section, dengan heading hierarchy yang
 *   berurutan (`<h1>`, `<h2>`, `<h3>`) tanpa melewati level.
 *
 * Requirement 9.7: IF gambar bersifat dekoratif, tidak menyampaikan informasi konten,
 *   atau tidak merupakan konten informatif, THEN THE gambar tersebut SHALL memiliki
 *   atribut `alt=""`. IF gambar menyampaikan informasi, THEN THE gambar tersebut
 *   SHALL memiliki atribut `alt` yang mendeskripsikan konten gambar tersebut.
 */

import fc from 'fast-check'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { LandingPage } from './LandingPage'

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}))

vi.mock('../hooks/useAuthState', () => ({
  useAuthState: () => ({ authState: 'unauthenticated' }),
}))

vi.mock('../hooks/useScrollPosition', () => ({
  useScrollPosition: () => ({ scrollY: 0 }),
}))

describe('Feature: landing-page', () => {
  it('Property 4: Heading Hierarchy Invariant', () => {
    // Feature: landing-page, Property 4: heading hierarchy is valid for any render of LandingPage
    fc.assert(
      fc.property(fc.constant(undefined), () => {
        const { container, unmount } = render(<LandingPage />)

        const h1Elements = container.querySelectorAll('h1')
        const h2Elements = container.querySelectorAll('h2')
        const h3Elements = container.querySelectorAll('h3')

        // Exactly one <h1> must exist
        expect(h1Elements.length).toBe(1)

        // All headings in DOM order
        const allHeadings = Array.from(
          container.querySelectorAll('h1, h2, h3'),
        )

        // All <h2> must appear after the <h1> in DOM order
        if (h2Elements.length > 0) {
          const h1Index = allHeadings.findIndex((el) => el.tagName === 'H1')
          h2Elements.forEach((h2) => {
            const h2Index = allHeadings.indexOf(h2)
            expect(h2Index).toBeGreaterThan(h1Index)
          })
        }

        // All <h3> must appear after at least one <h2> in DOM order
        if (h3Elements.length > 0) {
          expect(h2Elements.length).toBeGreaterThan(0)
          const firstH2Index = allHeadings.findIndex(
            (el) => el.tagName === 'H2',
          )
          h3Elements.forEach((h3) => {
            const h3Index = allHeadings.indexOf(h3)
            expect(h3Index).toBeGreaterThan(firstH2Index)
          })
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  }, 15000)

  it('Property 5: Image Accessibility Completeness', () => {
    // Feature: landing-page, Property 5: every <img> has an alt attribute present in the DOM
    // **Validates: Requirements 9.7**
    fc.assert(
      fc.property(fc.constant(undefined), () => {
        const { container, unmount } = render(<LandingPage />)

        const imgElements = Array.from(container.querySelectorAll('img'))

        // Every <img> must have an alt attribute (empty string is valid for decorative images)
        imgElements.forEach((img) => {
          expect(img.hasAttribute('alt')).toBe(true)
        })

        unmount()
      }),
      { numRuns: 100 },
    )
  }, 15000)
})
