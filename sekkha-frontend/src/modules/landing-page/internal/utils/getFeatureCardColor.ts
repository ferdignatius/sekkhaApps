export const COLOR_CYCLE = ['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'] as const

export type FeatureCardColor = (typeof COLOR_CYCLE)[number] | 'yellow' | 'coral' | 'rose'

export function getFeatureCardColor(index: number): FeatureCardColor {
  return COLOR_CYCLE[index % COLOR_CYCLE.length]
}

