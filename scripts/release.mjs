#!/usr/bin/env bun
// Sekkha monorepo release helper — bumps the shared semantic version
// across the root + both workspace package.json files.
//
// Usage:  bun run release <semver>     e.g.  bun run release 1.2.0
// Then:   update CHANGELOG.md, commit "release: vX.Y.Z", tag vX.Y.Z.
import { readFileSync, writeFileSync } from "node:fs"

const version = process.argv[2]

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: bun run release <semver>  — e.g. bun run release 1.2.0")
  process.exit(1)
}

const files = ["package.json", "sekkha-api/package.json", "sekkha-frontend/package.json"]

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf8"))
  pkg.version = version
  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n")
  console.log(`bumped ${file} -> ${version}`)
}

console.log("\nNext steps:")
console.log('  1. Move [Unreleased] entries to the new version in CHANGELOG.md')
console.log(`  2. git add -A && git commit -m "release: v${version}"`)
console.log(`  3. git tag -a v${version} -m "Release ${version}"`)
console.log(`  4. git push origin production v${version}`)
console.log("  5. On deploy, bump the pinned image tag in sekkha-api/docker-compose.yml")