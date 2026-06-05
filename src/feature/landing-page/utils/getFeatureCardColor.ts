const COLOR_CYCLE = ['yellow', 'coral', 'teal', 'rose'] as const

export type FeatureCardColor = (typeof COLOR_CYCLE)[number]

export function getFeatureCardColor(index: number): FeatureCardColor {
  return COLOR_CYCLE[index % 4]
}
