import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FloatingCommitFiles } from "../../../src/presentation/components/Floating/CommitFiles"
import type { FileStatus } from "../../../src/types"

vi.mock("../../../src/presentation/context", async () => {
  const { t } = await import("../../../src/i18n")
  return { useTranslation: () => ({ t: (key: Parameters<typeof t>[1]) => t("en", key) }) }
})

const files: FileStatus[] = [
  { path: "partial.ts", x: "M", y: "M", staged: true, unmerged: false },
  { path: "staged.ts", x: "A", y: " ", staged: true, unmerged: false },
  { path: "existing.ts", x: " ", y: "M", staged: false, unmerged: false },
  { path: "new.txt", x: "?", y: "?", staged: false, unmerged: false },
  { path: "conflict.ts", x: "U", y: "U", staged: false, unmerged: true },
]

function mount(disabled = false, list = files) {
  const onRun = vi.fn()
  const onPreview = vi.fn()
  render(<FloatingCommitFiles files={list} disabled={disabled} onRun={onRun} onPreview={onPreview} />)
  return { onRun, onPreview }
}

describe("Quick commit source-control groups", () => {
  afterEach(cleanup)

  it("separates staged, working-tree and conflicted files into independent accordions", () => {
    mount()
    const staged = screen.getByRole("region", { name: "Staged" })
    const changes = screen.getByRole("region", { name: "Changes" })
    expect(within(staged).getByText("staged.ts")).toBeTruthy()
    expect(within(staged).queryByText("new.txt")).toBeNull()
    expect(within(changes).getByText("new.txt")).toBeTruthy()
    expect(within(changes).queryByText("staged.ts")).toBeNull()
    expect(within(screen.getByRole("region", { name: "Conflicts" })).getByText("conflict.ts")).toBeTruthy()
    const toggle = within(staged).getByRole("button", { expanded: true })
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(within(staged).queryByRole("button", { name: "staged.ts" })).toBeNull()
    expect(within(changes).getByRole("button", { name: "new.txt" })).toBeTruthy()
    fireEvent.click(toggle)
    expect(within(staged).getByRole("button", { name: "staged.ts" })).toBeTruthy()
  })

  it("stages all working changes, including untracked and remaining partial changes, but not conflicts", () => {
    const { onRun } = mount()
    fireEvent.click(screen.getByRole("button", { name: "Stage all changes" }))
    expect(onRun).toHaveBeenCalledWith({ kind: "stage", paths: ["partial.ts", "existing.ts", "new.txt"] })
  })

  it("unstages all staged files without touching working-tree-only files", () => {
    const { onRun } = mount()
    fireEvent.click(screen.getByRole("button", { name: "Unstage all changes" }))
    expect(onRun).toHaveBeenCalledWith({ kind: "unstage", paths: ["partial.ts", "staged.ts"] })
  })

  it("previews the correct side of a partially staged file", () => {
    const { onPreview, onRun } = mount()
    for (const [label, staged] of [
      ["Staged", true],
      ["Changes", false],
    ] as const) {
      fireEvent.click(within(screen.getByRole("region", { name: label })).getByRole("button", { name: "partial.ts" }))
      expect(onPreview).toHaveBeenLastCalledWith({ ...files[0], staged })
    }
    expect(onRun).not.toHaveBeenCalled()
  })

  it("filters rows without changing the scope of an explicit all-files action", () => {
    const { onRun } = mount()
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "NEW.TXT" } })
    expect(screen.queryByText("existing.ts")).toBeNull()
    expect(screen.getByText("new.txt")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Stage all changes" }))
    expect(onRun).toHaveBeenCalledWith({ kind: "stage", paths: ["partial.ts", "existing.ts", "new.txt"] })
  })

  it.each([true, false])("disables bulk actions when busy (%s) or empty", (busy) => {
    mount(busy, busy ? files : [])
    for (const name of ["Stage all changes", "Unstage all changes"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true)
    }
  })
})
