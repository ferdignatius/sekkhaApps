# Sekkha Frontend Design System

Version: 2.0
Status: Active reference

Sekkha uses two references with different jobs:

- **Clay** defines visual language: warm cream canvas, near-black ink, saturated accents, rounded surfaces, Inter typography, restrained elevation.
- **Apple HIG** defines interaction quality: clarity, deference, depth, familiar navigation, 44pt touch targets, readable hierarchy, accessible focus, clear loading/error/empty states, and reduced motion support.

Clay is visual reference, not product identity. HIG is interaction reference, not a second color or component system.

## Source of truth

1. `src/styles.css` owns color, typography, radius, spacing, and elevation tokens.
2. `src/components/ui/` contains shadcn/Radix primitives. Do not edit manually.
3. `src/components/base/` contains Sekkha-styled primitives. Feature modules use these first.
4. `src/components/common/` contains reusable composites without feature business logic.
5. `src/shell/registry.ts` owns navigation metadata for desktop and mobile.

Do not add raw hex values, arbitrary radius values, custom shadows, or parallel material systems in feature code. Extend tokens only when an actual product need exists.

## Visual tokens

### Color

- Canvas: `#fffaf0`
- Surface soft: `#faf5e8`
- Surface card: `#f5f0e0`
- Surface strong: `#ebe6d6`
- Ink: `#0a0a0a`
- Body: `#3a3a3a`
- Muted: `#6a6a6a`
- Hairline: `#e5e5e5`
- Primary: near-black
- Accents: pink, teal, lavender, peach, ochre, mint
- Semantic: success, warning, error

Use semantic Tailwind tokens such as `bg-canvas`, `text-ink`, `text-muted`, `border-hairline`, `bg-clay-teal`. Never use color alone to communicate state.

### Typography

Inter is current production font for display, body, navigation, and controls. If a branded display font is introduced later, use it only for display headings.

- Display: 32-72px, weight 500
- Page title: 24-32px
- Section title: 18-24px, weight 600
- Body: 14-16px, line-height 1.5+
- Caption: 12-13px
- Button/navigation: 14px, weight 500-600

Use existing typography utilities. Do not create page-specific type scales.

### Shape and spacing

- 4px base grid
- 8, 12, 16, 24, 32px spacing
- 6px small control radius
- 8px compact control radius
- 12px buttons and inputs
- 16px content cards
- 24px feature cards and large surfaces
- Pill only for tags, filters, and compact status indicators

### Elevation

Default to flat surfaces and hairline borders. Use `shadow-m3-1` or `shadow-m3-2` only for transient elevation and important controls. Avoid glassmorphism as default. Use blur only for overlays or mobile navigation where it improves legibility.

## Component standard

Use `components/base` before creating a new component.

### Button

Preferred variants:

- `primary`: main action, one dominant CTA per region
- `secondary`: lower-emphasis filled action
- `outline`: bordered action
- `ghost`: low-emphasis action
- `destructive`: irreversible or dangerous action
- `link`: inline navigation

Preferred sizes: `default`, `sm`, `lg`, `icon`. Icon-only buttons require an accessible `aria-label`.

All controls need visible focus, disabled state, and a minimum 44px touch target unless dense desktop-only context is explicit.

### Common patterns

Use shared patterns for:

- Page header and breadcrumbs
- Loading skeleton
- Error state with retry
- Empty state with next action
- Form modal
- Data table and mobile list
- Tabs and filters
- Confirmation dialog

Do not create wrappers that only rename an existing primitive. Create shared components when they encode repeated behavior, accessibility, or visual rules.

## Navigation

`activeModules` is the only navigation registry. Desktop sidebar and mobile dock must derive from the same module metadata. Do not hardcode a second nav list.

Desktop uses sidebar navigation and wide content. Mobile uses bottom navigation for the primary destinations and a grouped overflow destination for secondary areas. Preserve current location, provide active state, and keep labels understandable without icons.

## Responsive rules

Design mobile first and verify at 320px, 390px, 768px, 1024px, and 1440px.

- Mobile: one-column content, full-width actions, card/list replacements for tables
- Tablet: two-column layouts where content remains readable
- Desktop: max content width 1280px, stable page padding, purposeful multi-column layouts
- Keep bottom content clear of the mobile dock and safe-area inset
- Do not hide essential actions behind hover
- Sheets and dialogs must support keyboard escape, focus management, and scrollable content

## Accessibility and motion

- Use semantic headings in order.
- Label every form control.
- Label icon-only controls.
- Use `aria-current` for navigation and `aria-busy` for loading.
- Do not rely on color alone.
- Respect `prefers-reduced-motion: reduce`.
- Test keyboard navigation at every interactive surface.

## Review checklist

- Uses existing token and shared component.
- No raw hex, arbitrary radius, or custom shadow in feature code.
- One clear primary action per region.
- Loading, error, and empty states exist.
- Touch targets and focus states meet HIG/WCAG expectations.
- Desktop and mobile layouts remain understandable.
- No duplicate navigation metadata.
