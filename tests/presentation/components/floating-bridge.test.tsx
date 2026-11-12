import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFloatingBridge } from "../../../src/presentation/components/Floating/useFloatingBridge"
import type { FloatingOperation, FloatingRequest } from "../../../src/presentation/components/Floating/bridge"
import type { FileStatus, StatusResult } from "../../../src/types"

const state = vi.hoisted(() => ({
  repo: {
    repo: "/project",
    busy: false,
    opening: false,
    runAction: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    handleOpen: vi.fn().mockResolvedValue(true),
  },
  handler: null as null | ((event: { payload: FloatingRequest }) => Promise<void>),
  emit: vi.fn().mockResolvedValue(undefined),
  git: {
    status: vi.fn(),
    branches: vi.fn(),
    stashList: vi.fn(),
    add: vi.fn(),
    unstage: vi.fn(),
    commit: vi.fn(),
    mergeOpts: vi.fn(),
    stash: vi.fn(),
    stashApply: vi.fn(),
  },
}))
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: state.emit,
  listen: vi.fn((_: string, handler: typeof state.handler) => {
    state.handler = handler
    return Promise.resolve(vi.fn())
  }),
}))
vi.mock("../../../src/infrastructure/git", () => ({ gitApi: state.git }))
vi.mock("../../../src/presentation/context", () => ({
  useRepo: () => state.repo,
  useTranslation: () => ({ t: (key: string) => key }),
}))

const file: FileStatus = { path: "a.ts", x: "M", y: " ", staged: true, unmerged: false }
function status(): StatusResult {
  return {
    root: "/project",
    branch: "main",
    head: "abc",
    files: [file],
    ahead: 0,
    behind: 0,
    merging: false,
    rebasing: false,
    cherryPicking: false,
    reverting: false,
  }
}

async function send(operation: FloatingOperation, repoPath = "/project", id = "request") {
  await state.handler?.({ payload: { id, operation, repoPath } })
  return state.emit.mock.calls.find(([, , reply]) => reply.id === id)?.[2]
}

describe("Floating bridge safety", () => {
  beforeEach(() => {
    state.repo.repo = "/project"
    state.repo.busy = false
    state.repo.opening = false
    state.repo.handleOpen.mockReset().mockResolvedValue(true)
    state.emit.mockClear()
    for (const mock of Object.values(state.git)) mock.mockReset().mockResolvedValue("")
    state.git.status.mockImplementation(async () => status())
    state.git.branches.mockResolvedValue([{ name: "feature", current: false }])
    state.git.stashList.mockResolvedValue([])
    // The application's action runner reports errors but does not rethrow them.
    state.repo.runAction.mockReset().mockImplementation(async (work: () => Promise<unknown>) => {
      try {
        await work()
      } catch {}
    })
    renderHook(() => useFloatingBridge())
  })
  afterEach(cleanup)

  it("returns live data from the active repository", async () => {
    const reply = await send({ kind: "snapshot" })
    expect(reply.data.repoPath).toBe("/project")
    expect(reply.data.status.files).toEqual([file])
    expect(state.git.commit).not.toHaveBeenCalled()
  })

  it("can open the chosen repository even if none is active", async () => {
    state.repo.repo = ""
    const reply = await send({ kind: "open-repo", path: "/chosen" }, "")
    expect(state.repo.handleOpen).toHaveBeenCalledWith("/chosen")
    expect(reply.data).toEqual({ opened: true })
    expect(reply.error).toBeUndefined()
  })

  it("reports invalid folders without opening the main application", async () => {
    state.repo.handleOpen.mockResolvedValue(false)
    const reply = await send({ kind: "open-repo", path: "/not-a-repo" }, "")
    expect(reply.error).toBe("floatingInvalidRepo")
  })

  it("rejects actions for an outdated repository", async () => {
    const reply = await send({ kind: "stage", paths: ["a.ts"] }, "/old-project")
    expect(reply.error).toBe("floatingRepoChanged")
    expect(state.git.add).not.toHaveBeenCalled()
  })

  it("does not commit when the staged selection changed after review", async () => {
    const reply = await send({
      kind: "commit",
      message: "Message",
      stagedPaths: ["other.ts"],
      head: "abc",
      branch: "main",
    })
    expect(reply.error).toBe("floatingReviewChanged")
    expect(state.git.commit).not.toHaveBeenCalled()
  })

  it("commits only after a valid explicit request and never stages implicitly", async () => {
    const reply = await send({
      kind: "commit",
      message: " Message ",
      stagedPaths: ["a.ts"],
      head: "abc",
      branch: "main",
    })
    expect(reply.error).toBeUndefined()
    expect(state.git.commit).toHaveBeenCalledWith("/project", "Message")
    expect(state.git.add).not.toHaveBeenCalled()
  })

  it.each(["merging", "rebasing", "cherryPicking", "reverting"] as const)(
    "rejects quick commits if %s started after review",
    async (operation) => {
      state.git.status.mockResolvedValue({ ...status(), [operation]: true })
      const reply = await send({
        kind: "commit",
        message: "Message",
        stagedPaths: ["a.ts"],
        head: "abc",
        branch: "main",
      })
      expect(reply.error).toBe("floatingCommitBlocked")
      expect(state.git.commit).not.toHaveBeenCalled()
    },
  )

  it("propagates errors swallowed by the main action runner", async () => {
    state.git.commit.mockRejectedValueOnce(new Error("Signing failed"))
    const reply = await send({ kind: "commit", message: "Message", stagedPaths: ["a.ts"], head: "abc", branch: "main" })
    expect(reply.error).toBe("Signing failed")
  })

  it("blocks merges when the working tree is dirty", async () => {
    const reply = await send({
      kind: "merge",
      branch: "feature",
      target: "main",
      head: "abc",
      squash: false,
      noFf: false,
    })
    expect(reply.error).toBe("floatingMergeBlocked")
    expect(state.git.mergeOpts).not.toHaveBeenCalled()
  })

  it("does not restore stashes into uncommitted changes", async () => {
    const reply = await send({ kind: "stash-apply", index: 0, hash: "stash-hash" })
    expect(reply.error).toBe("floatingMergeBlocked")
    expect(state.git.stashApply).not.toHaveBeenCalled()
  })

  it("does not commit to another branch even when HEAD is unchanged", async () => {
    const reply = await send({
      kind: "commit",
      message: "Message",
      stagedPaths: ["a.ts"],
      head: "abc",
      branch: "old-branch",
    })
    expect(reply.error).toBe("floatingReviewChanged")
    expect(state.git.commit).not.toHaveBeenCalled()
  })

  it("retains the action lock when a second request is rejected", async () => {
    let release: (() => void) | undefined
    state.git.add.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const first = send({ kind: "stage", paths: ["a.ts"] }, "/project", "first")
    const second = await send({ kind: "stage", paths: ["b.ts"] }, "/project", "second")
    const third = await send({ kind: "stage", paths: ["c.ts"] }, "/project", "third")
    expect(second.error).toBe("floatingBusy")
    expect(third.error).toBe("floatingBusy")
    expect(state.git.add).toHaveBeenCalledTimes(1)
    release?.()
    await first
  })
})
