/**
 * Property-Based Tests for LandingNavbar glassmorphism capsule & scroll state transitions.
 */

import fc from "fast-check"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { LandingNavbar } from "./LandingNavbar"

describe("Feature: landing-page", () => {
  it("Property 1: Navbar Glassmorphism Capsule & Scroll State Transitions", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (scrollY) => {
        const { container, unmount } = render(
          <LandingNavbar authState="unauthenticated" scrollY={scrollY} />
        )

        const header = container.querySelector("header")
        expect(header).not.toBeNull()
        expect(header!.className).toContain("sticky")

        const capsule = container.querySelector('[data-capsule="true"]')
        expect(capsule).not.toBeNull()

        const capsuleClass = capsule!.className
        expect(capsuleClass).toContain("rounded-full")
        expect(capsuleClass).toContain("backdrop-blur-xl")

        if (scrollY === 0) {
          expect(capsuleClass).toContain("bg-[#fffaf0]/60")
          expect(capsuleClass).not.toContain("bg-[#fffaf0]/75")
        } else {
          expect(capsuleClass).toContain("bg-[#fffaf0]/75")
          expect(capsuleClass).not.toContain("bg-[#fffaf0]/60")
        }

        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
