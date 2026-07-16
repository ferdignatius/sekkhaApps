import { render, screen } from '@testing-library/react'
import { HeroSection } from './HeroSection'

describe('HeroSection', () => {
  const defaultProps = {
    headline: 'Build Better Products Faster',
    subheadline: 'The all-in-one platform to manage your projects and teams.',
  }

  // Requirement 3.1 — headline rendered in <h1>
  it('renders the headline in an <h1> element', () => {
    render(<HeroSection {...defaultProps} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeDefined()
    expect(heading.textContent).toBe(defaultProps.headline)
  })

  // Requirement 3.2 — subheadline rendered in a <p>
  it('renders the subheadline text correctly', () => {
    render(<HeroSection {...defaultProps} />)
    const subheadline = screen.getByText(defaultProps.subheadline)
    expect(subheadline).toBeDefined()
    expect(subheadline.tagName.toLowerCase()).toBe('p')
  })

  // Requirement 3.3 — primary CTA button rendered
  it('renders the "Bergabung Sekarang" CTA button', () => {
    render(<HeroSection {...defaultProps} />)
    const primaryCta = screen.getByRole('button', { name: /bergabung sekarang/i })
    expect(primaryCta).toBeDefined()
  })

  // Requirement 3.4 — secondary CTA button rendered
  it('renders the "Lihat Kegiatan" CTA button', () => {
    render(<HeroSection {...defaultProps} />)
    const secondaryCta = screen.getByRole('button', { name: /lihat kegiatan/i })
    expect(secondaryCta).toBeDefined()
  })

  // Both buttons rendered together
  it('renders both CTA buttons', () => {
    render(<HeroSection {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
  })

  // Headline reflects the prop value passed in
  it('renders the correct headline when a different headline is provided', () => {
    render(<HeroSection headline="Custom Headline" subheadline={defaultProps.subheadline} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('Custom Headline')
  })

  // Subheadline reflects the prop value passed in
  it('renders the correct subheadline when a different subheadline is provided', () => {
    render(<HeroSection headline={defaultProps.headline} subheadline="Custom subheadline text." />)
    expect(screen.getByText('Custom subheadline text.')).toBeDefined()
  })
})
