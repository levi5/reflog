import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  cargoVersion,
  isBeta,
  isPrerelease,
  jsonVersion,
  nextVersion,
  parseVersion,
  readVersions,
  tagFor,
  versionProblems,
} from "../../scripts/version.mjs"

function fixture({ pkg = "0.1.0", cargo = "0.1.0", tauri = "0.1.0" }) {
  const root = mkdtempSync(join(tmpdir(), "reflog-version-"))
  mkdirSync(join(root, "src-tauri"), { recursive: true })
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "reflog", version: pkg }))
  writeFileSync(join(root, "src-tauri/Cargo.toml"), `[package]\nname = "reflog"\nversion = "${cargo}"\n`)
  writeFileSync(join(root, "src-tauri/tauri.conf.json"), JSON.stringify({ productName: "Reflog", version: tauri }))
  return {
    root,
    read: (path: string) => {
      try {
        return readFileSync(join(root, path), "utf8")
      } catch {
        return ""
      }
    },
  }
}

describe("parseVersion", () => {
  it("splits a stable version", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] })
  })

  it("splits a beta version", () => {
    expect(parseVersion("0.1.0-beta.4")).toEqual({ major: 0, minor: 1, patch: 0, prerelease: ["beta", "4"] })
  })

  it("rejects anything that is not semver", () => {
    expect(parseVersion("0.1")).toBeNull()
    expect(parseVersion("v0.1.0")).toBeNull()
    expect(parseVersion("0.1.0-beta.")).toBeNull()
    expect(parseVersion("")).toBeNull()
    expect(parseVersion(undefined)).toBeNull()
  })
})

describe("isPrerelease", () => {
  it("is true for beta and rc, false for stable", () => {
    expect(isPrerelease("0.1.0-beta.1")).toBe(true)
    expect(isPrerelease("0.1.0-rc.2")).toBe(true)
    expect(isPrerelease("0.1.0")).toBe(false)
    expect(isPrerelease("nope")).toBe(false)
  })
})

describe("isBeta", () => {
  it("only matches the beta channel", () => {
    expect(isBeta("0.1.0-beta.1")).toBe(true)
    expect(isBeta("0.1.0-rc.1")).toBe(false)
    expect(isBeta("0.1.0")).toBe(false)
  })
})

describe("nextVersion", () => {
  it("bumps patch and minor", () => {
    expect(nextVersion("0.1.0", "patch")).toBe("0.1.1")
    expect(nextVersion("0.1.0-beta.3", "patch")).toBe("0.1.1")
    expect(nextVersion("0.1.9", "minor")).toBe("0.2.0")
  })

  it("starts a beta when the version is stable", () => {
    expect(nextVersion("0.1.0", "beta")).toBe("0.1.0-beta.1")
  })

  it("increments the beta counter", () => {
    expect(nextVersion("0.1.0-beta.1", "beta")).toBe("0.1.0-beta.2")
    expect(nextVersion("0.1.0-beta.9", "beta")).toBe("0.1.0-beta.10")
  })

  it("restarts the counter when another prerelease channel was in use", () => {
    expect(nextVersion("0.1.0-rc.3", "beta")).toBe("0.1.0-beta.1")
  })

  it("promotes a beta to the final version", () => {
    expect(nextVersion("0.1.0-beta.7", "promote")).toBe("0.1.0")
  })

  it("refuses to promote a stable version and rejects unknown kinds", () => {
    expect(() => nextVersion("0.1.0", "promote")).toThrow(/not a prerelease/)
    expect(() => nextVersion("0.1.0", "nightly")).toThrow(/unknown release kind/)
    expect(() => nextVersion("0.1", "beta")).toThrow(/invalid semver/)
  })
})

describe("cargoVersion", () => {
  it("reads the package section and ignores dependency versions", () => {
    const toml = '[package]\nname = "reflog"\nversion = "0.1.0-beta.2"\n\n[dependencies]\nserde = { version = "1" }\n'
    expect(cargoVersion(toml)).toBe("0.1.0-beta.2")
  })

  it("returns an empty string when the file has no package version", () => {
    expect(cargoVersion('[dependencies]\nserde = "1"\n')).toBe("")
  })
})

describe("jsonVersion", () => {
  it("reads the version field", () => {
    expect(jsonVersion('{"version":"0.1.0-beta.1"}')).toBe("0.1.0-beta.1")
  })

  it("returns an empty string for invalid json or a missing field", () => {
    expect(jsonVersion("{")).toBe("")
    expect(jsonVersion("{}")).toBe("")
  })
})

describe("readVersions", () => {
  it("collects the three version sources", () => {
    const { read } = fixture({ pkg: "0.1.0-beta.1", cargo: "0.1.0-beta.1", tauri: "0.1.0-beta.1" })
    expect(readVersions(read)).toEqual({ package: "0.1.0-beta.1", cargo: "0.1.0-beta.1", tauri: "0.1.0-beta.1" })
  })
})

describe("versionProblems", () => {
  const consistent = { package: "0.1.0-beta.1", cargo: "0.1.0-beta.1", tauri: "0.1.0-beta.1" }

  it("accepts matching versions and the matching beta tag", () => {
    expect(versionProblems(consistent)).toEqual([])
    expect(versionProblems(consistent, "v0.1.0-beta.1")).toEqual([])
  })

  it("rejects a tag without the beta suffix", () => {
    expect(versionProblems(consistent, "v0.1.0")).toEqual([
      "tag v0.1.0 does not match version 0.1.0-beta.1 (expected v0.1.0-beta.1)",
    ])
  })

  it("rejects a tag that points at another version", () => {
    expect(versionProblems(consistent, "v0.2.0-beta.1")).toHaveLength(1)
  })

  it("reports every out of sync file", () => {
    const problems = versionProblems({ package: "0.1.0", cargo: "0.1.0", tauri: "0.2.0" })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("versions out of sync")
    expect(problems[0]).toContain("tauri.conf.json=0.2.0")
  })

  it("reports missing and invalid versions per file", () => {
    expect(versionProblems({ package: "", cargo: "nope", tauri: "0.1.0" })).toEqual([
      "package.json: version not found",
      "src-tauri/Cargo.toml: nope is not a valid semver",
      "versions out of sync: package.json= src-tauri/Cargo.toml=nope src-tauri/tauri.conf.json=0.1.0",
    ])
  })

  it("skips the tag check while the versions disagree", () => {
    expect(versionProblems({ package: "0.1.0", cargo: "0.1.0", tauri: "0.2.0" }, "v0.1.0")).toHaveLength(1)
  })
})

describe("tagFor", () => {
  it("prefixes the version with v", () => {
    expect(tagFor("0.1.0-beta.1")).toBe("v0.1.0-beta.1")
  })
})
