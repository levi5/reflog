import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FloatingWorkspace } from "../../../src/presentation/components/Floating/Workspace"
import type { FloatingSnapshot } from "../../../src/presentation/components/Floating/bridge"

const { request, invoke, chooseDirectory } = vi.hoisted(() => ({
  request: vi.fn(),
  invoke: vi.fn().mockResolvedValue(undefined),
  chooseDirectory: vi.fn().mockResolvedValue(null),
}))
vi.mock("../../../src/presentation/components/Floating/bridge", () => ({ requestFloating: request }))
vi.mock("@tauri-apps/api/core", () => ({ invoke }))
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: chooseDirectory }))
vi.mock("../../../src/presentation/context", async () => {
  const { t, formatMessage } = await import("../../../src/i18n")
  return {
    useTranslation: () => ({
      t: (key: Parameters<typeof t>[1]) => t("en", key),
      format: (key: Parameters<typeof t>[1], vars: Record<string, number | string>) => formatMessage("en", key, vars),
    }),
  }
})

function snapshot(): FloatingSnapshot {
  return {
    repoPath: "/work/project",
    busy: false,
    status: {
      root: "/work/project",
      branch: "main",
      head: "abc",
      ahead: 0,
      behind: 0,
      merging: false,
      rebasing: false,
      cherryPicking: false,
      reverting: false,
      files: [
        { path: "partial.ts", x: "M", y: "M", staged: true, unmerged: false },
        { path: "new.txt", x: "?", y: "?", staged: false, unmerged: false },
        { path: "existing.ts", x: " ", y: "M", staged: false, unmerged: false },
      ],
    },
    branches: [
      { name: "main", current: true, remote: false },
      { name: "feature", current: false, remote: false },
    ],
    stashes: [
      { index: 0, hash: "stash-hash", selector: "stash@{0}", message: "saved work", date: "today", author: "Author" },
    ],
  }
}

function Harness({ view = "commit" }: { view?: "commit" | "merge" }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  return (
    <FloatingWorkspace
      view={view}
      onBack={vi.fn()}
      drafts={drafts}
      onDraft={(path, text) => setDrafts((previous) => ({ ...previous, [path]: text }))}
    />
  )
}

describe("Floating workspaces", () => {
  let data: FloatingSnapshot
  beforeEach(() => {
    data = snapshot()
    request
      .mockReset()
      .mockImplementation(async (operation: { kind: string }) => (operation.kind === "snapshot" ? data : "ok"))
    invoke.mockClear()
    chooseDirectory.mockReset().mockResolvedValue(null)
  })
  afterEach(cleanup)

  it("shows staged, untracked and unstaged files without restaging partial files", async () => {
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    expect(screen.getByText("new.txt")).toBeTruthy()
    expect(screen.getByText("existing.ts")).toBeTruthy()
    expect(screen.getByText("Staged + changes outside the commit")).toBeTruthy()
    expect(request.mock.calls.every(([operation]) => operation.kind === "snapshot")).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Stage file: new.txt" }))
    await waitFor(() => expect(request).toHaveBeenCalledWith({ kind: "stage", paths: ["new.txt"] }, "/work/project"))
  })

  it("requires review and explicit confirmation before committing", async () => {
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    fireEvent.change(screen.getByRole("textbox", { name: "Commit message" }), { target: { value: "Add feature" } })
    fireEvent.click(screen.getByRole("button", { name: "Review commit" }))
    const review = screen.getByRole("dialog", { name: "Confirm commit" })
    expect(within(review).getByText("partial.ts")).toBeTruthy()
    expect(within(review).queryByText("new.txt")).toBeNull()
    expect(request.mock.calls.some(([operation]) => operation.kind === "commit")).toBe(false)
    fireEvent.click(within(review).getByRole("button", { name: "Confirm" }))
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        { kind: "commit", message: "Add feature", stagedPaths: ["partial.ts"], head: "abc", branch: "main" },
        "/work/project",
      ),
    )
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Commit message" }) as HTMLTextAreaElement).value).toBe(""),
    )
  })

  it("retains the commit draft and shows errors on failure", async () => {
    request.mockImplementation(async (operation: { kind: string }) => {
      if (operation.kind === "snapshot") return data
      throw new Error("Commit hook failed")
    })
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    fireEvent.change(screen.getByRole("textbox", { name: "Commit message" }), { target: { value: "Keep draft" } })
    fireEvent.click(screen.getByRole("button", { name: "Review commit" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))
    await screen.findByRole("alert")
    expect(screen.getByRole("alert").textContent).toContain("Commit hook failed")
    expect((screen.getByRole("textbox", { name: "Commit message" }) as HTMLTextAreaElement).value).toBe("Keep draft")
  })

  it("shows stashes separately and only restores into a clean working tree", async () => {
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    fireEvent.click(screen.getByRole("button", { name: /Stash\s*1/ }))
    expect(screen.getByText("saved work")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Restore changes" }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText("partial.ts")).toBeNull()
  })

  it("opens a file preview without mutating Git", async () => {
    request.mockImplementation(async (operation: { kind: string }) =>
      operation.kind === "snapshot" ? data : "+added line",
    )
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    fireEvent.click(screen.getByRole("button", { name: "new.txt" }))
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Diff" }) as HTMLTextAreaElement).value).toContain("+added line"),
    )
    expect(request).toHaveBeenCalledWith({ kind: "diff", file: data.status?.files[1] }, "/work/project")
  })

  it("displays conflicts and opens the existing full resolver", async () => {
    if (data.status) {
      data.status.files[0].unmerged = true
      data.status.merging = true
    }
    render(<Harness view="merge" />)
    await screen.findByText("1 conflicted file(s)")
    fireEvent.click(screen.getAllByRole("button", { name: "Open conflict resolver" })[0])
    expect(invoke).toHaveBeenCalledWith("floating_action", { action: "merge" })
    expect((screen.getByRole("button", { name: "Review merge" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("reviews a clean merge before executing it", async () => {
    if (data.status) data.status.files = []
    render(<Harness view="merge" />)
    await screen.findByRole("combobox")
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() })
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(screen.getByRole("option", { name: "feature" }))
    fireEvent.click(screen.getByRole("button", { name: "Review merge" }))
    expect(request.mock.calls.some(([operation]) => operation.kind === "merge")).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        { kind: "merge", branch: "feature", target: "main", head: "abc", squash: false, noFf: false },
        "/work/project",
      ),
    )
  })

  it("uses the themed branch picker and Escape only closes the picker", async () => {
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() })
    render(<Harness view="merge" />)
    const picker = await screen.findByRole("combobox", { name: "Bring changes from" })
    expect(picker.tagName).toBe("BUTTON")
    fireEvent.click(picker)
    expect(screen.getByRole("option", { name: "feature" })).toBeTruthy()
    fireEvent.keyDown(picker, { key: "Escape" })
    expect(screen.queryByRole("listbox")).toBeNull()
    expect(screen.getByRole("region", { name: "Merge center" })).toBeTruthy()
  })

  it("exposes move, restore size, and resize controls on a workspace and its preview", async () => {
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    expect(screen.getByRole("button", { name: "Drag to move this window" })).toBeTruthy()
    const reset = screen.getByRole("button", { name: "Restore this screen's default size" })
    fireEvent.click(reset)
    expect(invoke).toHaveBeenCalledWith("reset_floating_panel_size")
    expect(screen.getByRole("button", { name: "Drag the corner to resize this window" })).toBeTruthy()
    fireEvent.click(within(screen.getByRole("region", { name: "Staged" })).getByRole("button", { name: "partial.ts" }))
    const preview = await screen.findByRole("dialog")
    expect(within(preview).getByRole("button", { name: "Drag to move this window" })).toBeTruthy()
    expect(within(preview).getByRole("button", { name: "Restore this screen's default size" })).toBeTruthy()
  })

  it("selects a repository inside quick commit instead of opening the full application", async () => {
    data.repoPath = ""
    data.status = null
    chooseDirectory.mockResolvedValue("/work/chosen")
    request.mockImplementation(async (operation: { kind: string }) => {
      if (operation.kind === "open-repo") {
        data = snapshot()
        data.repoPath = "/work/chosen"
        return { opened: true }
      }
      return data
    })
    render(<Harness />)
    fireEvent.click(await screen.findByRole("button", { name: "Open repository" }))
    await waitFor(() => expect(request).toHaveBeenCalledWith({ kind: "open-repo", path: "/work/chosen" }))
    expect(chooseDirectory).toHaveBeenCalledWith({ directory: true, multiple: false, title: "Open repository" })
    expect(invoke).not.toHaveBeenCalled()
    expect((await screen.findAllByText("partial.ts")).length).toBe(2)
    expect(screen.getByText("chosen")).toBeTruthy()
  })

  it("keeps quick commit open when directory selection is cancelled", async () => {
    data.repoPath = ""
    data.status = null
    render(<Harness />)
    fireEvent.click(await screen.findByRole("button", { name: "Open repository" }))
    await waitFor(() => expect(chooseDirectory).toHaveBeenCalled())
    expect(request.mock.calls.some(([operation]) => operation.kind === "open-repo")).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it("ignores an older refresh failure after a newer refresh succeeds", async () => {
    render(<Harness />)
    await screen.findAllByText("partial.ts")
    let rejectOld: (error: Error) => void = () => {}
    request.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject
        }),
    )
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    await act(async () => {})
    await act(async () => rejectOld(new Error("Old connection failed")))
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getAllByText("partial.ts").length).toBe(2)
  })

  it.each(["merging", "rebasing", "cherryPicking", "reverting"] as const)(
    "does not allow a quick commit while %s",
    async (operation) => {
      if (data.status) data.status[operation] = true
      render(<Harness />)
      await screen.findAllByText("partial.ts")
      fireEvent.change(screen.getByRole("textbox", { name: "Commit message" }), { target: { value: "Message" } })
      expect((screen.getByRole("button", { name: "Review commit" }) as HTMLButtonElement).disabled).toBe(true)
    },
  )
})
