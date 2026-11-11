/**
 * Lightweight, allocation-conscious fuzzy name similarity utilities
 * for non-blocking duplicate detection on pre-provisioning & manual entry.
 */

export const MIN_NAME_SIMILARITY = 0.48

export function normalizePersonName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Generates bounded search probes (tokens + 3-char edge slices) for a single
 * fast indexed/contains DB query without full-table loading.
 */
export function buildNameSearchProbes(query: string): string[] {
  const normalized = normalizePersonName(query)
  if (normalized.length < 2) return []

  const probes = new Set<string>()
  const tokens = normalized.split(" ").filter((t) => t.length >= 2)

  for (const token of tokens) {
    probes.add(token)
    if (token.length >= 4) {
      probes.add(token.slice(0, 3))
    }
    if (token.length >= 5) {
      probes.add(token.slice(-3))
    }
    if (probes.size >= 6) break
  }

  return Array.from(probes).slice(0, 6)
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const prev = new Array<number>(b.length + 1)
  const curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

function diceBigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigrams = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2)
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1)
  }

  let overlap = 0
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2)
    const count = bigrams.get(bg) ?? 0
    if (count > 0) {
      bigrams.set(bg, count - 1)
      overlap++
    }
  }

  return (2 * overlap) / (a.length + b.length - 2)
}

/**
 * Returns similarity score in [0, 1]. Supports exact/prefix matches,
 * swapped word order ("Santoso Budi" vs "Budi Santoso"), and minor typos.
 */
export function computeNameSimilarityScore(query: string, candidateName: string): number {
  const normQ = normalizePersonName(query)
  const normT = normalizePersonName(candidateName)
  if (!normQ || !normT) return 0
  if (normQ === normT) return 1

  if (normT.startsWith(normQ)) {
    return 0.88 + 0.1 * (normQ.length / normT.length)
  }
  if (normT.includes(normQ) || normQ.includes(normT)) {
    const shorter = Math.min(normQ.length, normT.length)
    const longer = Math.max(normQ.length, normT.length)
    return 0.8 + 0.15 * (shorter / longer)
  }

  const qTokens = normQ.split(" ").filter(Boolean)
  const tTokens = normT.split(" ").filter(Boolean)
  if (!qTokens.length || !tTokens.length) return 0

  let tokenScoreSum = 0
  for (const qt of qTokens) {
    let bestToken = 0
    for (const tt of tTokens) {
      let score = 0
      if (tt === qt) {
        score = 1
      } else if (tt.startsWith(qt) || qt.startsWith(tt)) {
        score = 0.85 * (Math.min(qt.length, tt.length) / Math.max(qt.length, tt.length))
      } else {
        const dist = levenshteinDistance(qt, tt)
        score = Math.max(0, 1 - dist / Math.max(qt.length, tt.length))
      }
      if (score > bestToken) bestToken = score
    }
    tokenScoreSum += bestToken
  }

  const avgTokenScore = tokenScoreSum / qTokens.length
  const bigramScore = diceBigramSimilarity(normQ.replace(/\s+/g, ""), normT.replace(/\s+/g, ""))
  const fullLevenshtein = Math.max(
    0,
    1 - levenshteinDistance(normQ, normT) / Math.max(normQ.length, normT.length)
  )

  return Math.max(avgTokenScore * 0.65 + bigramScore * 0.35, fullLevenshtein)
}

