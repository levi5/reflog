import { SEMVER_REGEX } from "../../../shared/constants/semver"
import type { ISemverUseCase, NextVersionsType } from "../../../domain/entities/semver/semver"

interface ParsedVersion {
  raw: string
  prefix: string
  major: number
  minor: number
  patch: number
}

export class SemverUseCase implements ISemverUseCase {
  private isValidSemver(tag: string): boolean {
    return SEMVER_REGEX.test(tag.trim())
  }

  private rank(version: { major: number; minor: number; patch: number }): number {
    return version.major * 1_000_000_000_000 + version.minor * 1_000_000 + version.patch
  }

  suggestNextVersions(tags: string[]): NextVersionsType | null {
    let best: ParsedVersion | null = null

    for (const tag of tags) {
      if (!this.isValidSemver(tag)) continue

      const values = SEMVER_REGEX.exec(tag.trim())
      if (!values) continue

      const [, prefix = "", major = "0", minor = "0", patch = "0"] = values

      const version: ParsedVersion = {
        raw: tag.trim(),
        prefix,
        major: Number.parseInt(major, 10),
        minor: Number.parseInt(minor, 10),
        patch: Number.parseInt(patch, 10),
      }

      if (!best || this.rank(version) > this.rank(best)) {
        best = version
      }
    }

    if (!best) return null

    return {
      base: best.raw,
      patch: `${best.prefix}${best.major}.${best.minor}.${best.patch + 1}`,
      minor: `${best.prefix}${best.major}.${best.minor + 1}.0`,
      major: `${best.prefix}${best.major + 1}.0.0`,
    }
  }
}
