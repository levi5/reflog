// @vitest-environment node
import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { cachedSearch, libraryOwners } from "../../scripts/dpkg-query-cache.mjs"

describe("AppImage library-owner index", () => {
  const owners = libraryOwners(
    "libexample:amd64: /usr/lib/libexample.so.1\nlibexample-dev:amd64: /usr/lib/libexample.so\n" +
      "first, second: /usr/lib/shared.so\nlibspace:amd64: /opt/a folder/lib space.so.2\n",
  )

  it("preserves package names, architectures and paths for copyright lookup", () => {
    expect(cachedSearch(["-S", "/usr/lib/libexample.so.1"], owners)).toEqual({
      status: 0,
      stdout: "libexample:amd64: /usr/lib/libexample.so.1\n",
      stderr: "",
    })
    expect(cachedSearch(["-S", "/opt/a folder/lib space.so.2"], owners)?.stdout).toContain("libspace:amd64:")
    expect(cachedSearch(["-S", "/usr/lib/shared.so"], owners)?.stdout).toContain("first, second:")
  })

  it("does not confuse a library with its versioned neighbors", () => {
    expect(cachedSearch(["-S", "/usr/lib/libexample.so"], owners)?.stdout).toBe(
      "libexample-dev:amd64: /usr/lib/libexample.so\n",
    )
    expect(cachedSearch(["-S", "/usr/lib/libexample.so.99"], owners)?.status).toBe(1)
  })

  it.each([
    ["-S", "*.so*"],
    ["-S", "/usr/lib/lib[12].so"],
    ["-S", "/usr/bin/reflog"],
    ["-L", "libexample"],
    ["-S", "/usr/lib/a.so", "/usr/lib/b.so"],
  ])("delegates unsupported queries: %s %s", (...args) => {
    expect(cachedSearch(args, owners)).toBeNull()
  })

  it.skipIf(process.platform !== "linux")("serves the index through the CLI and falls back for other queries", () => {
    const temporary = mkdtempSync(join(tmpdir(), "reflog-query-test-"))
    try {
      const index = join(temporary, "owners.json")
      writeFileSync(index, JSON.stringify(owners))
      const helper = fileURLToPath(new URL("../../scripts/dpkg-query-cache.mjs", import.meta.url))
      const env = { ...process.env, REFLOG_DPKG_INDEX: index }
      const hit = spawnSync(process.execPath, [helper, "-S", "/usr/lib/libexample.so.1"], { env, encoding: "utf8" })
      expect(hit.status).toBe(0)
      expect(hit.stdout).toBe("libexample:amd64: /usr/lib/libexample.so.1\n")
      const miss = spawnSync(process.execPath, [helper, "-S", "/usr/lib/missing.so"], { env, encoding: "utf8" })
      expect(miss.status).toBe(1)
      expect(miss.stderr).toContain("no path found")
      const fallback = spawnSync(process.execPath, [helper, "--version"], { env, encoding: "utf8" })
      expect(fallback.status).toBe(0)
      expect(fallback.stdout).toContain("dpkg-query")
      writeFileSync(index, "invalid json")
      const invalid = spawnSync(process.execPath, [helper, "--version"], { env, encoding: "utf8" })
      expect(invalid.status).toBe(0)
      expect(invalid.stdout).toBe(fallback.stdout)
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  })
})
