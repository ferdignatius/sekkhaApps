import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CTABanner } from './CTABanner'

/**
 * Unit tests for CTABanner component.
 * Requirements: 6.5, 6.6
 */
describe('CTABanner', () => {
  it('renders the heading text', () => {
    render(
      <CTABanner
        heading="Start your journey today"
        onSignUpNavigate={() => {}}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Start your journey today' }),
    ).toBeDefined()
  })

  it('calls onSignUpNavigate when "bergabung sekarang" button is clicked', () => {
    const onSignUpNavigate = vi.fn()

    render(
      <CTABanner
        heading="Join us"
        onSignUpNavigate={onSignUpNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bergabung sekarang/i }))

    expect(onSignUpNavigate).toHaveBeenCalledTimes(1)
  })

  it('still invokes onSignUpNavigate even when the function throws (no internal suppression)', () => {
    // CTABanner has no try-catch — it delegates error handling to the parent
    // (LandingPage, implemented in task 8.1).  We verify the prop is always
    // called on click regardless of what it does; error display is out of scope
    // for this component.
    //
    // React 19 re-dispatches event handler errors as Node uncaughtExceptions.
    // We intercept process-level uncaughtException for this test to keep the
    // suite clean while still asserting the prop was invoked.
    const throwingNavigate = vi.fn(() => {
      throw new Error('Route not available')
    })

    const uncaughtHandler = (err: Error) => {
      if (err.message === 'Route not available') return // expected, suppress it
      throw err // re-throw anything unexpected
    }
    process.on('uncaughtException', uncaughtHandler)

    try {
      render(
        <CTABanner
          heading="Join us"
          onSignUpNavigate={throwingNavigate}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: /bergabung sekarang/i }))
    } finally {
      process.off('uncaughtException', uncaughtHandler)
    }

    expect(throwingNavigate).toHaveBeenCalledTimes(1)
  })
})
