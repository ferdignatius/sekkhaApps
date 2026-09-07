# Changelog

All notable changes to Sekkha Apps. Semver (`MAJOR.MINOR.PATCH`); newest on top. Entries are curated for humans — see git log for the full history.

## [Unreleased]

### Changed
- Landing page responsive overhaul per `DESIGN.md`: mobile-first section padding, typography scale fixed at breakpoints (no more 72px hero overflow), StatsSection dividers corrected on 2-column mobile grid, sticky notes shrink on small screens.
- Removed codewhale runtime state and unused scratch files; added `AGENTS.md` with repo conventions.

### Fixed
- Landing page hero/feature/event/leaderboard headlines no longer win over mobile size utilities (custom `text-display-*` utility conflicts).
- Dashboard mockup used undefined color tokens (`sekkha-yellow-dark`, `sekkha-brand-yellow-deep`, `bg-sekkha-surface-yellow`, `fill-orange-55`); mapped to valid Clay tokens.
- Weekly quests in the dashboard mockup are now real `<button>`s with `aria-pressed` (were non-focusable `div`s).
- Mobile nav drawer now traps Tab focus and scrolls when taller than the viewport.

## [1.1.0] - 2026-09-06

### Added
- Full-stack modular core: auth, users, events, leaderboard, configure, teams, notifications, pengurus, schools modules.
- Public landing page for Vihara Tri Maha Dharma (hero, features, stats, events, leaderboard, CTA, footer).
- Insight & analytics dashboard page for pengurus/admin.
- Testing infrastructure: vitest + jsdom unit tests and fast-check property-based tests.
- Configurable JWT expiry (`JWT_EXPIRES_IN`).

### Changed
- Backend runtime migrated to a full Bun stack (dev tooling + Alpine Docker image).
- Docker compose pins the published API image `ferdignatius/sekkha-api:v1.0.0`.

### Fixed
- Landing page routing, auth redirect, and navigation scaffolding stabilized across modules.