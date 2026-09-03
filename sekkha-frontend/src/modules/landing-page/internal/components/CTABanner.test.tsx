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

  it('calls onSignUpNavigate when CTA button is clicked', () => {
    const onSignUpNavigate = vi.fn()

    render(
      <CTABanner
        heading="Join us"
        onSignUpNavigate={onSignUpNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /(join for free|join now|bergabung sekarang)/i }))

    expect(onSignUpNavigate).toHaveBeenCalledTimes(1)
  })

  it('still invokes onSignUpNavigate even when the function throws (no internal suppression)', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /(join for free|join now|bergabung sekarang)/i }))
    } finally {
      process.off('uncaughtException', uncaughtHandler)
    }

    expect(throwingNavigate).toHaveBeenCalledTimes(1)
  })
})
