/**
 * Shared display-name initials formatter used across Profile, People, Home, Sidebar, and Events.
 *
 * Rules (Opsi A — Leaderboard stays `@username`-based for public pseudonymity):
 * - Strips leading/trailing punctuation around tokens (e.g. `(Aktivis)` won't yield `(`).
 * - Multi-word names (>= 2 words): first letter of word 1 + word 2 (`Admin Sekkha` -> `AS`, `Budi Santoso (Aktivis)` -> `BS`).
 * - Single-word names (1 word): first 2 alphanumeric chars (`Suki` -> `SU`, `X` -> `X`).
 * - Empty / symbol-only input: returns `fallback` (default `"U"`).
 */
export function getInitials(
  name?: string | null,
  fallback: string = "U"
): string {
  if (!name) return fallback

  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ""))
    .filter(Boolean)

  if (words.length === 0) return fallback
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

