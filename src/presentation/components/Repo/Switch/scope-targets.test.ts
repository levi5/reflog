import { describe, expect, it } from "vitest"
import type { SubmoduleInfo } from "../../../../types"
import { buildScopeGroups, filterScopeGroups, submoduleStateTone } from "./scope-targets"

const submodule = (path: string, state = " ", name = path): SubmoduleInfo => ({
  name,
  path,
  url: "",
  branch: "",
  hash: "a".repeat(40),
  state,
})

describe("buildScopeGroups", () => {
  it("returns only recents when the repo has no parent and no submodules", () => {
    const groups = buildScopeGroups({
      lang: "pt",
      repo: "/work/app",
      chain: ["/work/app"],
      submodules: [],
      siblingModules: [],
      recents: ["/work/app", "/work/api"],
    })

    expect(groups.map((group) => group.id)).toEqual(["recents"])
    expect(groups[0].targets.map((target) => target.path)).toEqual(["/work/api"])
  })

  it("lists the direct parent first when inside a submodule", () => {
    const groups = buildScopeGroups({
      lang: "pt",
      repo: "/work/super/libs/lib",
      chain: ["/work/super", "/work/super/libs/lib"],
      submodules: [],
      siblingModules: [submodule("libs/lib"), submodule("libs/api")],
      recents: [],
    })

    expect(groups.map((group) => group.id)).toEqual(["parents", "siblings"])
    expect(groups[0].targets[0].path).toBe("/work/super")
    expect(groups[0].targets[0].name).toBe("super")
    expect(groups[0].targets[0].badge).toBe("pai direto")
    expect(groups[1].targets.map((target) => target.path)).toEqual(["/work/super/libs/api"])
  })

  it("orders ancestors from the closest parent to the outermost", () => {
    const groups = buildScopeGroups({
      lang: "pt",
      repo: "/a/b/c/deep",
      chain: ["/a", "/a/b", "/a/b/c", "/a/b/c/deep"],
      submodules: [],
      siblingModules: [],
      recents: [],
    })

    expect(groups[0].label).toBe("Superprojetos")
    expect(groups[0].targets.map((target) => target.path)).toEqual(["/a/b/c", "/a/b", "/a"])
    expect(groups[0].targets[0].badge).toBe("pai direto")
    expect(groups[0].targets[1].badge).toBeUndefined()
  })

  it("resolves submodule paths against the current repo", () => {
    const groups = buildScopeGroups({
      lang: "pt",
      repo: "/work/super",
      chain: ["/work/super"],
      submodules: [submodule("libs/lib", "+"), submodule("libs/api", "-")],
      siblingModules: [],
      recents: [],
    })

    expect(groups.map((group) => group.id)).toEqual(["children"])
    expect(groups[0].targets.map((target) => target.path)).toEqual(["/work/super/libs/lib", "/work/super/libs/api"])
    expect(groups[0].targets[0].tone).toBe("warn")
    expect(groups[0].targets[1].tone).toBe("muted")
    expect(groups[0].targets[0].badge).toBe("divergente")
  })

  it("never repeats the same path across groups", () => {
    const groups = buildScopeGroups({
      lang: "en",
      repo: "/work/super",
      chain: ["/work/super"],
      submodules: [submodule("libs/lib")],
      siblingModules: [submodule("libs/lib")],
      recents: ["/work/super", "/work/super/libs/lib"],
    })

    const paths = groups.flatMap((group) => group.targets.map((target) => target.path))
    expect(paths).toEqual([...new Set(paths)])
  })

  it("caps the recents list", () => {
    const recents = Array.from({ length: 30 }, (_, index) => `/work/repo-${index}`)
    const groups = buildScopeGroups({
      lang: "pt",
      repo: "/work/app",
      chain: ["/work/app"],
      submodules: [],
      siblingModules: [],
      recents,
      maxRecents: 3,
    })

    expect(groups[0].targets).toHaveLength(3)
  })
})

describe("filterScopeGroups", () => {
  const groups = buildScopeGroups({
    lang: "pt",
    repo: "/work/super",
    chain: ["/work/super"],
    submodules: [submodule("libs/lib"), submodule("apps/web")],
    siblingModules: [],
    recents: ["/work/other"],
  })

  it("keeps every group when the query is empty", () => {
    expect(filterScopeGroups(groups, "  ")).toBe(groups)
  })

  it("drops groups without matches", () => {
    const filtered = filterScopeGroups(groups, "web")
    expect(filtered).toHaveLength(1)
    expect(filtered[0].targets.map((target) => target.path)).toEqual(["/work/super/apps/web"])
  })

  it("matches on the full path", () => {
    const filtered = filterScopeGroups(groups, "libs/lib")
    expect(filtered[0].targets.map((target) => target.name)).toEqual(["lib"])
  })
})

describe("submoduleStateTone", () => {
  it("maps the git submodule status flags", () => {
    expect(submoduleStateTone(" ")).toBe("ok")
    expect(submoduleStateTone("+")).toBe("warn")
    expect(submoduleStateTone("-")).toBe("muted")
    expect(submoduleStateTone("U")).toBe("danger")
    expect(submoduleStateTone("?")).toBe("ok")
  })
})
