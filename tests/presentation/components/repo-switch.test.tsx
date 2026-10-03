import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import { ScopeBreadcrumb, ScopeGroupSection } from "../../../src/presentation/components/Repo/Switch"
import { buildScopeGroups } from "../../../src/presentation/components/Repo/Switch/scope-targets"
import type { SubmoduleInfo } from "../../../src/types"

const submodule = (path: string, state = " "): SubmoduleInfo => ({
  name: path,
  path,
  url: "",
  branch: "",
  hash: "b".repeat(40),
  state,
})

function render(node: React.ReactNode) {
  return renderToString(<TranslationProvider>{node}</TranslationProvider>)
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

  it("renders the superproject row and the sibling rows with their state badges", () => {
    const [parents, siblings] = buildScopeGroups({
      lang: "pt",
      repo: "/work/super/libs/lib",
      chain: ["/work/super", "/work/super/libs/lib"],
      submodules: [],
      siblingModules: [submodule("libs/lib"), submodule("libs/api", "+")],
      recents: [],
    })

    const html = render(
      <>
        <ScopeGroupSection group={parents} activeId="" onSelect={noop} onOpen={noop} />
        <ScopeGroupSection group={siblings} activeId="" onSelect={noop} onOpen={noop} />
      </>,
    )

    expect(html).toContain("Superprojeto")
    expect(html).toContain('title="/work/super/libs/api"')
    expect(html).toContain("divergente")
    expect(html).not.toContain("libs/lib")
  })

  it("renders the submodules of a plain repo", () => {
    const [children] = buildScopeGroups({
      lang: "pt",
      repo: "/work/super",
      chain: ["/work/super"],
      submodules: [submodule("libs/lib"), submodule("apps/web", "-")],
      siblingModules: [],
      recents: [],
    })

    const html = render(<ScopeGroupSection group={children} activeId="" onSelect={noop} onOpen={noop} />)

    expect(html).toContain("Submódulos")
    expect(html).toContain('title="/work/super/libs/lib"')
    expect(html).toContain("não iniciado")
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
