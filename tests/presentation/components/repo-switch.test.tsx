import { describe, expect, it } from "vitest"
import { ScopeBreadcrumb, ScopeGroupSection } from "../../../src/presentation/components/Repo/Switch"
import { buildScopeGroups } from "../../../src/presentation/components/Repo/Switch/scope-targets"
import type { SubmoduleInfo } from "../../../src/types"
import { renderString } from "../helpers/render"

const submodule = (path: string, state = " ", behind = 0): SubmoduleInfo => ({
  name: path,
  path,
  url: "",
  branch: "",
  hash: "b".repeat(40),
  state,
  ahead: 0,
  behind,
})

function render(node: React.ReactElement) {
  return renderString(node, { lang: "en" })
}

const noop = () => undefined

describe("RepoSwitcher presentation", () => {
  it("shows the plain root path when the repo is not a submodule", () => {
    const html = render(<ScopeBreadcrumb repo="/work/app" chain={["/work/app"]} />)
    expect(html).toContain("/work/app")
    expect(html).not.toContain("Subm")
  })

  it("shows the direct parent when inside a submodule", () => {
    const html = render(<ScopeBreadcrumb repo="/work/super/libs/lib" chain={["/work/super", "/work/super/libs/lib"]} />)
    expect(html).toContain("/work/super")
  })

  it("renders the superproject row and marks the desynchronized sibling on its icon", () => {
    const [parents, siblings] = buildScopeGroups({
      lang: "en",
      repo: "/work/super/libs/lib",
      chain: ["/work/super", "/work/super/libs/lib"],
      submodules: [],
      siblingModules: [submodule("libs/lib"), submodule("libs/api", "+", 4)],
      recents: [],
    })

    const html = render(
      <>
        <ScopeGroupSection group={parents} activeId="" onSelect={noop} onOpen={noop} />
        <ScopeGroupSection group={siblings} activeId="" onSelect={noop} onOpen={noop} />
      </>,
    )

    expect(html).toContain("Superproject")
    expect(html).toContain('title="/work/super/libs/api"')
    expect(html).toContain('title="4 behind upstream"')
    expect(html).toContain("toneWarn")
    expect(html).not.toContain(">divergente<")
    expect(html).not.toContain("libs/lib")
  })

  it("renders the submodules of a plain repo", () => {
    const [children] = buildScopeGroups({
      lang: "en",
      repo: "/work/super",
      chain: ["/work/super"],
      submodules: [submodule("libs/lib"), submodule("apps/web", "-")],
      siblingModules: [],
      recents: [],
    })

    const html = render(<ScopeGroupSection group={children} activeId="" onSelect={noop} onOpen={noop} />)

    expect(html).toContain("Submodules")
    expect(html).toContain('title="/work/super/libs/lib"')
    expect(html).toContain("toneOk")
    expect(html).not.toContain("toneWarn")
    expect(html).not.toContain("targetBadge")
  })

  it("marks the active target", () => {
    const [group] = buildScopeGroups({
      lang: "en",
      repo: "/work/super",
      chain: ["/work/super"],
      submodules: [submodule("libs/lib")],
      siblingModules: [],
      recents: [],
    })
    const targetId = group.targets[0].id

    const html = render(<ScopeGroupSection group={group} activeId={targetId} onSelect={noop} onOpen={noop} />)

    expect(html).toContain("selected")
  })
})
