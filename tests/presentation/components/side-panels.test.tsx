import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { CommitDetailModal } from "../../../src/presentation/components/Commit/DetailModal"
import { StashPanel } from "../../../src/presentation/components/Branch/Stash"
import { SubmodulePanel } from "../../../src/presentation/components/Branch/Submodule"
import { WorktreePanel } from "../../../src/presentation/components/Branch/Worktree"
import { TagPanel } from "../../../src/presentation/components/Tag/Panel"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import type { CommitInfo, SubmoduleInfo, WorktreeInfo } from "../../../src/types"

const COMMIT: CommitInfo = {
  hash: "50c7b05f2a1d9c8e7b6a5d4c3b2a1908f7e6d5c4b",
  short: "50c7b05",
  author: "Dev <dev@example.com>",
  date: "8 de out. de 2026",
  message: "refactor(appbar): drop the redundant button",
  parents: ["a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"],
  refs: ["HEAD -> master"],
}

const SUBMODULE: SubmoduleInfo = {
  name: "vendor/lib",
  path: "vendor/lib",
  url: "https://example.com/lib.git",
  branch: "main",
  hash: "abc1234",
  state: "checked out",
  ahead: 0,
  behind: 0,
}

const WORKTREE: WorktreeInfo = {
  path: "/home/dev/projects/reflog-wt",
  head: "abc1234",
  branch: "feat/x",
  detached: false,
  bare: false,
  main: false,
}

function renderWithTranslation(node: ReactElement) {
  return render(<TranslationProvider>{node}</TranslationProvider>)
}

function expectSwitchesOnly(html: string) {
  const checkboxes = html.match(/type="checkbox"/g) ?? []
  const switches = html.match(/type="checkbox" role="switch"/g) ?? []
  expect(switches.length).toBeGreaterThan(0)
  expect(checkboxes.length).toBe(switches.length)
}

describe("CommitDetailModal", () => {
  it("renders the localized title and the commit hash", () => {
    renderWithTranslation(<CommitDetailModal commit={COMMIT} onClose={() => {}} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog.textContent).toContain("50c7b05")
    expect(dialog.textContent).toContain(COMMIT.message)
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy()
  })

  it("renders nothing without a commit", () => {
    const { container } = renderWithTranslation(<CommitDetailModal commit={null} onClose={() => {}} />)
    expect(container.innerHTML).toBe("")
  })

  it("closes through the modal close button", () => {
    const onClose = vi.fn()
    renderWithTranslation(<CommitDetailModal commit={COMMIT} onClose={onClose} />)
    screen.getByRole("button", { name: "Close" }).click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe("side panels expose their actions", () => {
  it("stash renders the pop, apply, diff and drop actions", () => {
    const html = renderToString(
      <TranslationProvider>
        <StashPanel
          stashMessage=""
          onStashMessageChange={() => {}}
          onStash={() => {}}
          onPop={() => {}}
          stashes={[{ selector: "stash@{0}", index: 0, hash: "50c7b05", author: "Dev", date: "27 de out.", message: "wip" }]}
          onApply={() => {}}
          onShowDiff={async () => ""}
          onDrop={() => {}}
        />
      </TranslationProvider>,
    )
    expect(html).toContain("wip")
    expect(html.match(/<button/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it("stash keeps the option toggles as switches", () => {
    const html = renderToString(
      <TranslationProvider>
        <StashPanel
          stashMessage=""
          onStashMessageChange={() => {}}
          onStash={() => {}}
          onPop={() => {}}
          onKeepIndexChange={() => {}}
          onStagedOnlyChange={() => {}}
        />
      </TranslationProvider>,
    )
    expectSwitchesOnly(html)
  })

  it("submodule renders update, open and remove", () => {
    const html = renderToString(
      <TranslationProvider>
        <SubmodulePanel
          submodules={[SUBMODULE]}
          onUpdate={() => {}}
          onSync={() => {}}
          onOpen={() => {}}
          onRemove={() => {}}
        />
      </TranslationProvider>,
    )
    expect(html).toContain("vendor/lib")
    expect(html.match(/<button/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it("worktree renders open, remove and unlock", () => {
    const html = renderToString(
      <TranslationProvider>
        <WorktreePanel
          worktrees={[{ ...WORKTREE, locked: true }]}
          onAdd={() => {}}
          onRemove={() => {}}
          onUnlock={() => {}}
        />
      </TranslationProvider>,
    )
    expect(html).toContain("reflog-wt")
    expect(html).toContain("Unlock")
    expect(html.match(/<button/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it("tag panel renders the signed toggle as a switch", () => {
    const html = renderToString(
      <TranslationProvider>
        <TagPanel tags={["v0.1.0"]} onCreateTag={() => {}} onDeleteTag={() => {}} />
      </TranslationProvider>,
    )
    expectSwitchesOnly(html)
  })
})
