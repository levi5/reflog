import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ExplorerTree } from "../../../src/presentation/components/Explorer"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import type { FileStatus } from "../../../src/types"

const TRACKED = ["src/a.ts", "src/b.ts", "docs/c.md", "README.md"]

const STATUS: FileStatus[] = [
  { path: "src/a.ts", x: "M", y: " ", staged: true, unmerged: false },
  { path: "README.md", x: " ", y: "M", staged: false, unmerged: false },
]

function renderTree(props: Partial<Parameters<typeof ExplorerTree>[0]> = {}) {
  const base = {
    trackedFiles: TRACKED,
    statusFiles: STATUS,
    selectedFilePath: null,
    ...props,
  }
  return {
    ...render(
      <TranslationProvider>
        <ExplorerTree {...base} />
      </TranslationProvider>,
    ),
    base,
  }
}

const rows = () => screen.getAllByRole("treeitem")
const fileRow = (name: string) => screen.getByTitle(name)

describe("ExplorerTree", () => {
  it("exposes the tree structure to assistive tech", () => {
    renderTree()
    expect(screen.getByRole("tree")).not.toBeNull()
    const src = rows().find((row) => row.textContent?.startsWith("src"))
    expect(src?.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getAllByRole("group").length).toBeGreaterThan(0)
    expect(fileRow("README.md").getAttribute("aria-selected")).toBe("false")
  })

  it("marks the selected file", () => {
    renderTree({ selectedFilePath: "README.md" })
    expect(fileRow("README.md").getAttribute("aria-selected")).toBe("true")
    expect(fileRow("src/a.ts").getAttribute("aria-selected")).toBe("false")
  })

  it("keeps the node DOM stable when only the selection moves", () => {
    const props = { onSelect: vi.fn(), onStage: vi.fn(), onUnstage: vi.fn() }
    const { rerender } = render(
      <TranslationProvider>
        <ExplorerTree {...props} trackedFiles={TRACKED} statusFiles={STATUS} selectedFilePath="src/a.ts" />
      </TranslationProvider>,
    )
    const before = fileRow("src/a.ts")
    rerender(
      <TranslationProvider>
        <ExplorerTree {...props} trackedFiles={TRACKED} statusFiles={STATUS} selectedFilePath="README.md" />
      </TranslationProvider>,
    )
    expect(fileRow("src/a.ts")).toBe(before)
    expect(fileRow("README.md").getAttribute("aria-selected")).toBe("true")
  })

  it("collapses a folder on click", async () => {
    renderTree()
    const src = rows().find((row) => row.textContent?.startsWith("src"))
    await userEvent.click(src ?? screen.getByText("src"))
    expect(rows().some((row) => row.getAttribute("aria-expanded") === "false")).toBe(true)
    expect(screen.queryByTitle("src/a.ts")).toBeNull()
  })

  it("stages and unstages from the row actions", async () => {
    const onStage = vi.fn()
    const onUnstage = vi.fn()
    renderTree({ onStage, onUnstage })
    await userEvent.click(screen.getByLabelText("Unstage src/a.ts"))
    await userEvent.click(screen.getByLabelText("Stage README.md"))
    expect(onUnstage).toHaveBeenCalledWith("src/a.ts")
    expect(onStage).toHaveBeenCalledWith("README.md")
  })

  it("reports the file and its staged flag on selection", async () => {
    const onSelect = vi.fn()
    renderTree({ onSelect })
    await userEvent.click(fileRow("src/a.ts"))
    expect(onSelect).toHaveBeenCalledWith("src/a.ts", true)
  })

  it("asks for a search when nothing matches", () => {
    renderTree({ query: "nao-existe" })
    expect(screen.queryAllByRole("treeitem")).toHaveLength(0)
  })

  it("shows the empty state without files", () => {
    renderTree({ trackedFiles: [], statusFiles: [] })
    expect(screen.queryAllByRole("treeitem")).toHaveLength(0)
  })

  it("disables the actions while the repo is busy", () => {
    renderTree({ busy: true })
    expect(screen.getByLabelText("Unstage src/a.ts").hasAttribute("disabled")).toBe(true)
  })
})
