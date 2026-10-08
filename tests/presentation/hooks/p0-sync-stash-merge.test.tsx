import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const gitMock = {
  stashList: vi.fn(),
  stashPop: vi.fn(),
  stashClear: vi.fn(),
  mergeContinue: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
}

vi.mock("../../../src/infrastructure/git", () => ({ gitApi: gitMock }))

const { useStashOps } = await import("../../../src/presentation/hooks/staging/useStashOps")
const { useMerge } = await import("../../../src/presentation/hooks/merge/useMerge")

function renderStash(confirmed = true) {
  const runAction = vi.fn(async (work: () => Promise<unknown>) => {
    await work()
  })
  const requestConfirm = vi.fn().mockResolvedValue(confirmed)
  const deps = {
    lang: "en" as const,
    repo: "/repo",
    runAction,
    requestConfirm,
    setMsg: vi.fn(),
  }
  let ops!: ReturnType<typeof useStashOps>
  function Harness() {
    ops = useStashOps(deps)
    return null
  }
  renderToString(<Harness />)
  return { ops, runAction, requestConfirm }
}

function renderMerge(mergeContinueImpl: () => Promise<string>) {
  gitMock.mergeContinue.mockImplementation(mergeContinueImpl)
  const runAction = vi.fn(async (work: () => Promise<unknown>) => {
    await work()
  })
  const deps = {
    lang: "en" as const,
    repo: "/repo",
    status: null,
    conflicts: [],
    setConflicts: vi.fn(),
    refresh: vi.fn(async () => {}),
    runAction,
    setBusy: vi.fn(),
    setMsg: vi.fn(),
    readCommitMessage: () => "Merge conflict resolved",
    clearCommitMessage: vi.fn(),
  }
  let merge!: ReturnType<typeof useMerge>
  function Harness() {
    merge = useMerge(deps)
    return null
  }
  renderToString(<Harness />)
  return { merge, runAction }
}

describe("P0 stash by index + clear", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.stashList.mockResolvedValue([])
    gitMock.stashPop.mockResolvedValue("popped")
    gitMock.stashClear.mockResolvedValue("cleared")
  })

  it("stashPopIt forwards the index to the backend", async () => {
    const { ops } = renderStash()
    await ops.stashPopIt(2)
    expect(gitMock.stashPop).toHaveBeenCalledWith("/repo", 2)
  })

  it("stashPopIt without an index pops the latest", async () => {
    const { ops } = renderStash()
    await ops.stashPopIt()
    expect(gitMock.stashPop).toHaveBeenCalledWith("/repo", undefined)
  })

  it("stashClear confirms before clearing", async () => {
    const { ops, requestConfirm } = renderStash()
    await ops.stashClear()
    expect(requestConfirm).toHaveBeenCalled()
    expect(gitMock.stashClear).toHaveBeenCalledWith("/repo")
  })

  it("cancelled stashClear does not call the backend", async () => {
    const { ops } = renderStash(false)
    await ops.stashClear()
    expect(gitMock.stashClear).not.toHaveBeenCalled()
  })
})

describe("P0 native merge --continue", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.add.mockResolvedValue("")
    gitMock.commit.mockResolvedValue("")
  })

  it("continueMerge uses git merge --continue when it works", async () => {
    const { merge } = renderMerge(async () => "ok")
    await merge.continueMerge()
    expect(gitMock.mergeContinue).toHaveBeenCalledWith("/repo")
    expect(gitMock.commit).not.toHaveBeenCalled()
  })

  it("continueMerge falls back to add+commit when native continuation fails", async () => {
    const { merge } = renderMerge(async () => {
      throw new Error("nothing to commit")
    })
    await merge.continueMerge()
    expect(gitMock.mergeContinue).toHaveBeenCalledWith("/repo")
    expect(gitMock.add).toHaveBeenCalled()
    expect(gitMock.commit).toHaveBeenCalled()
  })
})
