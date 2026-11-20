export const motionTokens = {
  ease: {
    enter: [0.22, 1, 0.36, 1] as const,
    standard: [0.4, 0, 0.2, 1] as const,
  },
  spring: {
    snappy: {
      type: "spring" as const,
      stiffness: 420,
      damping: 32,
      mass: 0.8,
    },
    morph: {
      type: "spring" as const,
      stiffness: 340,
      damping: 30,
      mass: 0.9,
    },
  },
  blur: {
    subtle: 2,
    soft: 4,
  },
  duration: {
    fast: 0.14,
  },
} as const
