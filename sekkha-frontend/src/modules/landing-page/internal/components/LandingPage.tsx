import * as React from 'react'
import { useRouter } from '@tanstack/react-router'

import { useAuthState } from '../hooks/useAuthState'
import { useScrollPosition } from '../hooks/useScrollPosition'
import { landingContent } from '../data/landingContent'

import { LandingNavbar } from './LandingNavbar'
import { HeroSection } from './HeroSection'
import { FeatureSection } from './FeatureSection'
import { StatsSection } from './StatsSection'
import { LeaderboardSection } from './LeaderboardSection'
import { EventsSection } from './EventsSection'
import { CTABanner } from './CTABanner'
import { LandingFooter } from './LandingFooter'

/**
 * LandingPage — halaman utama Sekkha (Komunitas Remaja Vihara Tri Maha Dharma).
 *
 * Susunan section:
 *   Hero → Features → Stats → Events → Leaderboard → CTA Banner → Footer
 *
 * Tidak mengimpor dari app-sidebar, nav-main, nav-user, nav-projects, team-switcher.
 *
 * @requirements 1.1, 1.2, 1.3, 9.1, 9.6, 10.3
 */
export function LandingPage() {
  const router = useRouter()
  const { authState } = useAuthState()
  const { scrollY } = useScrollPosition()

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (errorMessage === null) return
    const timer = setTimeout(() => setErrorMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [errorMessage])

  const handleSignUpNavigate = async () => {
    try {
      await router.navigate({ to: '/sign-up' as string })
    } catch {
      setErrorMessage('Halaman pendaftaran tidak tersedia saat ini.')
    }
  }

  return (
    <div className="relative min-h-screen bg-sekkha-canvas">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-[100] focus-visible:top-4 focus-visible:left-4 focus-visible:px-4 focus-visible:py-2 focus-visible:bg-sekkha-canvas focus-visible:text-sekkha-ink focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-primary"
      >
        Skip to main content
      </a>

      {/* Error toast */}
      {errorMessage !== null && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-sekkha-ink text-sekkha-on-dark px-6 py-3 rounded-xl shadow-lg text-body-sm"
        >
          {errorMessage}
        </div>
      )}

      {/* Navbar */}
      <LandingNavbar authState={authState} scrollY={scrollY} />

      {/* Main content */}
      <main id="main-content">
        <HeroSection
          headline={landingContent.hero.headline}
          subheadline={landingContent.hero.subheadline}
        />

        <FeatureSection features={landingContent.features} />

        <StatsSection stats={landingContent.stats} />

        <EventsSection
          heading={landingContent.events.heading}
          subheading={landingContent.events.subheading}
          items={landingContent.events.items}
        />

        <LeaderboardSection
          heading={landingContent.leaderboard.heading}
          subheading={landingContent.leaderboard.subheading}
          entries={landingContent.leaderboard.entries}
        />

        <CTABanner
          heading={landingContent.ctaBanner.heading}
          onSignUpNavigate={handleSignUpNavigate}
        />
      </main>

      {/* Footer */}
      <LandingFooter navColumns={landingContent.footer.navColumns} />
    </div>
  )
}
