import { describe, expect, it } from "vitest"
import {
  sameBranches,
  sameConflicts,
  sameFiles,
  sameRemotes,
  sameStatus,
  sameStrings,
  sameSubmodules,
} from "../../../src/presentation/hooks/repository/snapshot"
import type { BranchInfo, ConflictFile, FileStatus, RemoteInfo, StatusResult, SubmoduleInfo } from "../../../src/types"

const file = (path: string, x: string, y: string): FileStatus => ({
  path,
  x,
  y,
  staged: x !== " " && x !== "?" && x !== "!",
  unmerged: false,
})

const status = (overrides: Partial<StatusResult> = {}): StatusResult => ({
  root: "/repo",
  branch: "main",
  head: "aaa1111",
  ahead: 0,
  behind: 0,
  files: [file("a.ts", " ", "M")],
  merging: false,
  cherryPicking: false,
  reverting: false,
  rebasing: false,
  ...overrides,
})

const branch = (overrides: Partial<BranchInfo> = {}): BranchInfo => ({
  name: "main",
  current: true,
  remote: false,
  ahead: 0,
  behind: 0,
  upstream: "origin/main",
  ...overrides,
})

const conflict = (overrides: Partial<ConflictFile> = {}): ConflictFile => ({
  path: "a.ts",
  abs_path: "/repo/a.ts",
  content: "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> other",
  conflicts: [],
  ...overrides,
})

const remote = (overrides: Partial<RemoteInfo> = {}): RemoteInfo => ({
  name: "origin",
  url: "git@host:o/r.git",
  ...overrides,
})

const submodule = (overrides: Partial<SubmoduleInfo> = {}): SubmoduleInfo => ({
  name: "lib",
  path: "libs/lib",
  url: "git@host:o/lib.git",
  branch: "main",
  hash: "bbb2222",
  state: "ok",
  ahead: 0,
  behind: 0,
  ...overrides,
})

describe("repository snapshot equality", () => {
  it("treats an identical status payload as unchanged", () => {
    expect(sameStatus(status(), status())).toBe(true)
  })

  it("detects every field a background refresh can change", () => {
    expect(sameStatus(status(), status({ branch: "feature" }))).toBe(false)
    expect(sameStatus(status(), status({ head: "fff9999" }))).toBe(false)
    expect(sameStatus(status(), status({ ahead: 2 }))).toBe(false)
    expect(sameStatus(status(), status({ behind: 1 }))).toBe(false)
    expect(sameStatus(status(), status({ merging: true }))).toBe(false)
    expect(sameStatus(status(), status({ rebasing: true }))).toBe(false)
    expect(sameStatus(status(), status({ files: [] }))).toBe(false)
    expect(sameStatus(status(), status({ files: [file("a.ts", "M", " ")] }))).toBe(false)
    expect(sameStatus(null, status())).toBe(false)
  })

  it("compares file lists by content, not by identity", () => {
    const current = [file("a.ts", " ", "M"), file("b.ts", "?", "?")]
    const same = [file("a.ts", " ", "M"), file("b.ts", "?", "?")]
    expect(sameFiles(current, same)).toBe(true)
    expect(sameFiles(current, [...same].reverse())).toBe(false)
    expect(sameFiles(current, [...same, file("c.ts", "?", "?")])).toBe(false)
  })

  it("keeps branch identity stable while tracking counts and upstream", () => {
    expect(sameBranches([branch()], [branch()])).toBe(true)
    expect(sameBranches([branch()], [branch({ behind: 3 })])).toBe(false)
    expect(sameBranches([branch()], [branch({ upstream: null })])).toBe(false)
    expect(sameBranches([branch()], [branch({ current: false })])).toBe(false)
    expect(sameBranches([branch()], [branch({ name: "side" })])).toBe(false)
    expect(sameBranches([branch(), branch({ name: "side" })], [branch({ name: "side" }), branch()])).toBe(false)
  })

  it("compares conflicts by path and content", () => {
    expect(sameConflicts([conflict()], [conflict()])).toBe(true)
    expect(sameConflicts([conflict()], [conflict({ content: "resolved" })])).toBe(false)
    expect(sameConflicts([conflict()], [conflict({ path: "b.ts" })])).toBe(false)
  })

  it("compares tags, remotes and submodules", () => {
    expect(sameStrings(["v1", "v2"], ["v1", "v2"])).toBe(true)
    expect(sameStrings(["v1", "v2"], ["v2", "v1"])).toBe(false)
    expect(sameRemotes([remote()], [remote()])).toBe(true)
    expect(sameRemotes([remote()], [remote({ url: "https://host/o/r.git" })])).toBe(false)
    expect(sameSubmodules([submodule()], [submodule()])).toBe(true)
    expect(sameSubmodules([submodule()], [submodule({ state: "diverged" })])).toBe(false)
    expect(sameSubmodules([submodule()], [submodule({ hash: "ccc3333" })])).toBe(false)
    expect(sameSubmodules([submodule()], [submodule({ behind: 3 })])).toBe(false)
  })
})
