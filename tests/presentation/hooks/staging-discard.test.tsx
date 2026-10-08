import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FileStatus } from "../../../src/types"
import type { RunAction } from "../../../src/presentation/hooks/repository/action-types"

const gitMock = {
  diff: vi.fn(),
  discard: vi.fn(),
  discardUntracked: vi.fn(),
  unstage: vi.fn(),
  applyPatch: vi.fn(),
  add: vi.fn(),
  stashList: vi.fn(),
}

vi.mock("../../../src/infrastructure/git", () => ({ gitApi: gitMock }))

const { useStaging } = await import("../../../src/presentation/hooks/repository/useStaging")

type Staging = ReturnType<typeof useStaging>

const tracked = (x: string, y: string, path: string): FileStatus => ({
  path,
  x,
  y,
  staged: x !== " " && x !== "?" && x !== "!",
  unmerged: false,
})

function renderStaging(confirmed = true) {
  const runAction = vi.fn<RunAction>(async (work) => {
    await work()
  })
  const requestConfirm = vi.fn().mockResolvedValue(confirmed)
  const deps = {
    lang: "en" as const,
    repo: "/repo",
    submodules: [],
    runAction,
    requestConfirm,
    setMsg: vi.fn(),
  }
  let staging!: Staging
  function Harness() {
    staging = useStaging(deps)
    return null
  }
  renderToString(<Harness />)
  return { staging, runAction, requestConfirm }
}

describe("discarding files", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.diff.mockResolvedValue("")
    gitMock.discard.mockResolvedValue("")
    gitMock.discardUntracked.mockResolvedValue("Removing new.txt")
    gitMock.unstage.mockResolvedValue("")
    gitMock.applyPatch.mockResolvedValue("")
  })

  it("deletes an untracked file instead of restoring it", async () => {
    const { staging } = renderStaging()
    await staging.discardFile(tracked("?", "?", "new.txt"))
    expect(gitMock.discardUntracked).toHaveBeenCalledWith("/repo", ["new.txt"])
    expect(gitMock.discard).not.toHaveBeenCalled()
  })

  it("unstages before deleting a file that was added to the index", async () => {
    const { staging } = renderStaging()
    await staging.discardFile(tracked("A", "?", "new.txt"))
    expect(gitMock.unstage).toHaveBeenCalledWith("/repo", "new.txt")
    expect(gitMock.discardUntracked).toHaveBeenCalledWith("/repo", ["new.txt"])
    expect(gitMock.discard).not.toHaveBeenCalled()
  })

  it("restores a tracked modification and keeps the patch as undo", async () => {
    gitMock.diff.mockResolvedValue("diff --git a/f.txt b/f.txt")
    const { staging, runAction } = renderStaging()
    await staging.discardFile(tracked(" ", "M", "f.txt"))
    expect(gitMock.discard).toHaveBeenCalledWith("/repo", "f.txt")
    expect(gitMock.discardUntracked).not.toHaveBeenCalled()
    expect(runAction.mock.calls[0][2]).toMatchObject({
      undo: expect.any(Function),
    })
  })

  it("splits a mixed selection between deletion and discard", async () => {
    const { staging, requestConfirm } = renderStaging()
    await staging.discardFiles([tracked("?", "?", "new.txt"), tracked(" ", "M", "f.txt")])
    expect(gitMock.discardUntracked).toHaveBeenCalledWith("/repo", ["new.txt"])
    expect(gitMock.discard).toHaveBeenCalledWith("/repo", "f.txt")
    expect(requestConfirm.mock.calls[0][1]).toMatch(/1 untracked file/)
  })

  it("does nothing when the confirmation is declined", async () => {
    const { staging } = renderStaging(false)
    await staging.discardFile(tracked("?", "?", "new.txt"))
    await staging.discardFiles([tracked("?", "?", "new.txt")])
    expect(gitMock.discardUntracked).not.toHaveBeenCalled()
    expect(gitMock.discard).not.toHaveBeenCalled()
  })
})
