import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const gitMock = {
  worktrees: vi.fn(),
  worktreeLock: vi.fn(),
  worktreeUnlock: vi.fn(),
  worktreePrune: vi.fn(),
  submoduleSync: vi.fn(),
  submoduleAdd: vi.fn(),
  submoduleRemove: vi.fn(),
  submoduleUpdate: vi.fn(),
  tagCreate: vi.fn(),
  tagPush: vi.fn(),
  clone: vi.fn(),
  repoRoot: vi.fn(),
  checkRepo: vi.fn(),
}

vi.mock("../../../src/infrastructure/git", () => ({ gitApi: gitMock }))

const { useWorktreeOps } = await import("../../../src/presentation/hooks/repository/useWorktreeOps")
const { useStaging } = await import("../../../src/presentation/hooks/repository/useStaging")
const { useTagOps } = await import("../../../src/presentation/hooks/repository/useTagOps")
const { useRepoOpener } = await import("../../../src/presentation/hooks/repository/useRepoOpener")

const runAction = vi.fn(async (work: () => Promise<unknown>) => {
  await work()
})

function renderWorktrees() {
  let ops!: ReturnType<typeof useWorktreeOps>
  function Harness() {
    ops = useWorktreeOps({ lang: "en", repo: "/repo", runAction })
    return null
  }
  renderToString(<Harness />)
  return ops
}

function renderStaging(confirmed = true) {
  const requestConfirm = vi.fn().mockResolvedValue(confirmed)
  let staging!: ReturnType<typeof useStaging>
  function Harness() {
    staging = useStaging({
      lang: "en",
      repo: "/repo",
      submodules: [],
      runAction,
      requestConfirm,
      setMsg: vi.fn(),
    })
    return null
  }
  renderToString(<Harness />)
  return { staging, requestConfirm }
}

function renderTags() {
  let tags!: ReturnType<typeof useTagOps>
  function Harness() {
    tags = useTagOps({
      lang: "en",
      repo: "/repo",
      runAction,
      requestConfirm: vi.fn().mockResolvedValue(true),
      git: gitMock as unknown as Parameters<typeof useTagOps>[0]["git"],
    })
    return null
  }
  renderToString(<Harness />)
  return tags
}

function renderOpener() {
  const messageService = {
    loading: vi.fn().mockReturnValue("id"),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }
  let opener!: ReturnType<typeof useRepoOpener>
  function Harness() {
    opener = useRepoOpener({
      lang: "en",
      git: gitMock as unknown as Parameters<typeof useRepoOpener>[0]["git"],
      repoInput: "",
      opening: false,
      setRepoInput: vi.fn(),
      setRepo: vi.fn(),
      setMsg: vi.fn(),
      setBusy: vi.fn(),
      setOpening: vi.fn(),
      pushRecent: vi.fn(),
      fail: vi.fn(),
      messageService: messageService as unknown as Parameters<typeof useRepoOpener>[0]["messageService"],
    })
    return null
  }
  renderToString(<Harness />)
  return opener
}

describe("P1 worktree lock/unlock/prune", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.worktreeLock.mockResolvedValue("locked")
    gitMock.worktreeUnlock.mockResolvedValue("unlocked")
    gitMock.worktreePrune.mockResolvedValue("pruned")
  })

  it("lock, unlock and prune call the backend and reload", async () => {
    const ops = renderWorktrees()
    await ops.lockWorktree("/wt", "reason")
    expect(gitMock.worktreeLock).toHaveBeenCalledWith("/repo", "/wt", "reason")
    await ops.unlockWorktree("/wt")
    expect(gitMock.worktreeUnlock).toHaveBeenCalledWith("/repo", "/wt")
    await ops.pruneWorktrees()
    expect(gitMock.worktreePrune).toHaveBeenCalledWith("/repo")
  })
})

describe("P1 submodule add/remove/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.submoduleSync.mockResolvedValue("synced")
    gitMock.submoduleAdd.mockResolvedValue("added")
    gitMock.submoduleRemove.mockResolvedValue("removed")
  })

  it("sync, add and remove call the backend", async () => {
    const { staging } = renderStaging()
    await staging.submoduleSync()
    expect(gitMock.submoduleSync).toHaveBeenCalledWith("/repo")
    await staging.submoduleAdd("https://x/y.git", "libs/y")
    expect(gitMock.submoduleAdd).toHaveBeenCalledWith("/repo", "https://x/y.git", "libs/y")
    await staging.submoduleRemove("libs/old")
    expect(gitMock.submoduleRemove).toHaveBeenCalledWith("/repo", "libs/old")
  })

  it("cancelled removal does not call the backend", async () => {
    const { staging } = renderStaging(false)
    await staging.submoduleRemove("libs/old")
    expect(gitMock.submoduleRemove).not.toHaveBeenCalled()
  })

  it("add with empty fields does not call the backend", async () => {
    const { staging } = renderStaging()
    await staging.submoduleAdd(" ", "libs/y")
    expect(gitMock.submoduleAdd).not.toHaveBeenCalled()
  })
})

describe("P1 signed tag + push", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.tagCreate.mockResolvedValue("tagged")
    gitMock.tagPush.mockResolvedValue("pushed")
  })

  it("createTag forwards signed and pushTag sends the tag", async () => {
    const tags = renderTags()
    await tags.createTag("v1.0", "release", true)
    expect(gitMock.tagCreate).toHaveBeenCalledWith("/repo", "v1.0", "release", true)
    await tags.pushTag("v1.0")
    expect(gitMock.tagPush).toHaveBeenCalledWith("/repo", "v1.0")
  })
})

describe("P1 clone with options", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gitMock.clone.mockResolvedValue("cloned")
    gitMock.repoRoot.mockResolvedValue("/repo")
  })

  it("forwards depth, branch and recurse to the backend", async () => {
    const opener = renderOpener()
    await opener.cloneRepo("https://x/y.git", "/tmp/y", { depth: 1, branch: "main", recurseSubmodules: true })
    expect(gitMock.clone).toHaveBeenCalledWith("https://x/y.git", "/tmp/y", {
      depth: 1,
      branch: "main",
      recurseSubmodules: true,
    })
  })

  it("rejects invalid depth without calling the backend", async () => {
    const opener = renderOpener()
    await opener.cloneRepo("https://x/y.git", "/tmp/y", { depth: 0 })
    expect(gitMock.clone).not.toHaveBeenCalled()
  })
})
