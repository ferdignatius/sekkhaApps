/**
 * Property-Based Tests for LandingNavbar scroll state transitions.
 *
 * **Validates: Requirements 2.6, 2.7**
 *
 * Requirement 2.6: WHEN posisi scroll vertikal halaman bernilai lebih dari 64px,
 *   THE Navbar SHALL menerapkan backdrop blur (`backdrop-filter: blur(12px)`).
 *
 * Requirement 2.7: WHEN pengunjung melakukan scroll hingga posisi vertikal halaman
 *   melebihi 0px, THE Navbar SHALL menampilkan border bawah dengan warna
 *   `{colors.hairline}` (1px solid).
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LandingNavbar } from './LandingNavbar'

describe('Feature: landing-page', () => {
  it('Property 1: Navbar Scroll State Transitions', () => {
    // Feature: landing-page, Property 1: navbar applies correct classes for every scrollY value
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (scrollY) => {
        const { container, unmount } = render(
          <LandingNavbar authState="unauthenticated" scrollY={scrollY} />,
        )

        const header = container.querySelector('header')
        expect(header).not.toBeNull()

        const className = header!.className

        if (scrollY === 0) {
          // At scroll position 0: no bottom border, no backdrop-blur
          expect(className).not.toContain('border-b')
          expect(className).not.toContain('backdrop-blur')
        } else if (scrollY > 0 && scrollY <= 64) {
          // 1–64px scroll: border-b applied, but NOT backdrop-blur
          expect(className).toContain('border-b')
          expect(className).toContain('border-sekkha-hairline')
          expect(className).not.toContain('backdrop-blur')
        } else {
          // > 64px scroll: both border-b AND backdrop-blur applied
          expect(className).toContain('border-b')
          expect(className).toContain('border-sekkha-hairline')
          expect(className).toContain('backdrop-blur-md')
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
