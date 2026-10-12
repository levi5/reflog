import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

import { BranchPanel } from "../../../src/presentation/components/Branch/Panel"
import { SettingsProvider } from "../../../src/presentation/context"
import type { BranchInfo } from "../../../src/types"

const BRANCHES: BranchInfo[] = [
  { name: "main", current: true, remote: false },
  { name: "feature-a", current: false, remote: false },
  { name: "feature-b", current: false, remote: false },
  { name: "origin/feature-c", current: false, remote: true },
  { name: "feature-z", current: false, remote: false },
]

function renderPanel(overrides: Partial<ComponentProps<typeof BranchPanel>> = {}) {
  const props = {
    branches: BRANCHES,
    currentBranchName: "main",
    newBranchName: "",
    onNewBranchNameChange: vi.fn(),
    onCreateBranch: vi.fn(),
    onCheckoutBranch: vi.fn(),
    onDeleteBranch: vi.fn(),
    onRenameBranch: vi.fn(),
    onDeleteBranches: vi.fn(),
    ...overrides,
  }
  render(
    <SettingsProvider>
      <BranchPanel {...props} />
    </SettingsProvider>,
  )
  return props
}

function checkbox(name: string): HTMLInputElement {
  return screen.getByRole("checkbox", { name: `Select branch: ${name}` }) as HTMLInputElement
}

describe("branch panel multi-select", () => {
  it("only offers a checkbox for local branches that are not checked out", () => {
    renderPanel()
    expect(screen.getAllByRole("checkbox")).toHaveLength(3)
    expect(screen.queryByRole("checkbox", { name: "Select branch: main" })).toBeNull()
    expect(screen.queryByRole("checkbox", { name: "Select branch: origin/feature-c" })).toBeNull()
  })

  it("renders no toolbar while nothing is selected", () => {
    renderPanel()
    expect(screen.queryByRole("toolbar", { name: "Selected branches" })).toBeNull()
  })

  it("counts the selected branches in the toolbar", () => {
    renderPanel()
    fireEvent.click(checkbox("feature-a"))
    fireEvent.click(checkbox("feature-b"))
    expect(screen.getByRole("toolbar", { name: "Selected branches" }).textContent).toContain("2 selected")
  })

  it("selects a contiguous range on shift-click, skipping the branches that cannot be deleted", () => {
    renderPanel()
    fireEvent.click(checkbox("feature-a"))
    fireEvent.click(checkbox("feature-z"), { shiftKey: true })
    expect(checkbox("feature-a").checked).toBe(true)
    expect(checkbox("feature-b").checked).toBe(true)
    expect(checkbox("feature-z").checked).toBe(true)
    expect(screen.getByRole("toolbar").textContent).toContain("3 selected")
  })

  it("deletes every selected branch in a single call", () => {
    const props = renderPanel()
    fireEvent.click(checkbox("feature-a"))
    fireEvent.click(checkbox("feature-b"))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(props.onDeleteBranches).toHaveBeenCalledWith(["feature-a", "feature-b"], false)
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("force deletes the selection on demand", () => {
    const props = renderPanel()
    fireEvent.click(checkbox("feature-a"))
    fireEvent.click(screen.getByRole("button", { name: "Force delete" }))
    expect(props.onDeleteBranches).toHaveBeenCalledWith(["feature-a"], true)
  })

  it("selects every deletable branch at once and clears them", () => {
    renderPanel()
    fireEvent.click(checkbox("feature-a"))
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(screen.getByRole("toolbar").textContent).toContain("3 selected")
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }))
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("drops the selection when the toolbar is dismissed by hand", () => {
    renderPanel()
    fireEvent.click(checkbox("feature-a"))
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }))
    expect(checkbox("feature-a").checked).toBe(false)
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("leaves the single branch delete asking for confirmation instead of deleting right away", () => {
    const props = renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Delete branch: feature-a" }))
    expect(props.onDeleteBranch).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Force delete: feature-a" })).toBeTruthy()
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("keeps the previous panel behaviour when no bulk handler is wired", () => {
    renderPanel({ onDeleteBranches: undefined })
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
    expect(screen.getByRole("button", { name: "Delete branch: feature-a" })).toBeTruthy()
  })
})
