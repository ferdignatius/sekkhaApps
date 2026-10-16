//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.tanstack/**",
      "**/.output/**",
      "**/.nitro/**",
      "**/dist/**",
      "src/routeTree.gen.ts",
      "src/components/ui/**",
    ],
  },
  ...tanstackConfig,
  {
    rules: {
      "sort-imports": "off",
      "import/order": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "no-shadow": "warn",
    },
  },
]
