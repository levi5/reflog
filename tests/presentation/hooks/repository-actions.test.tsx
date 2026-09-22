import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { gitApi } from "../../../src/infrastructure/git"
import type { RunAction } from "../../../src/presentation/hooks/repository/action-types"
import { useBranchOps } from "../../../src/presentation/hooks/branch/useBranchOps"
import { useGitActions } from "../../../src/presentation/hooks/repository/useGitActions"
import { useRemoteOps } from "../../../src/presentation/hooks/repository/useRemoteOps"
import { useTagOps } from "../../../src/presentation/hooks/repository/useTagOps"

// These hooks only expose callbacks; no DOM or effect lifecycle is needed.
function renderActions(confirmed = true) {
  const git = {
    ...gitApi,
    status: vi.fn().mockResolvedValue({ files: [] }),
    checkout: vi.fn().mockResolvedValue("ok"),
    stash: vi.fn().mockResolvedValue("Saved working directory"),
    branchDelete: vi.fn().mockResolvedValue("ok"),
    branchRename: vi.fn().mockResolvedValue("ok"),
    tagCreate: vi.fn().mockResolvedValue("ok"),
    remoteAdd: vi.fn().mockResolvedValue("ok"),
    remoteRemove: vi.fn().mockResolvedValue("ok"),
    cherryPick: vi.fn().mockResolvedValue("ok"),
    reset: vi.fn().mockResolvedValue("ok"),
  }
  const runAction = vi.fn<RunAction>(async (work) => {
    await work()
  })
  const requestConfirm = vi.fn().mockResolvedValue(confirmed)
  const deps = { lang: "en" as const, repo: "/repo", git, runAction, requestConfirm }
  let actions!: ReturnType<typeof useBranchOps> &
    ReturnType<typeof useTagOps> &
    ReturnType<typeof useRemoteOps> &
    ReturnType<typeof useGitActions>
  function Harness() {
    actions = { ...useBranchOps(deps), ...useTagOps(deps), ...useRemoteOps(deps), ...useGitActions(deps) }
    return null
  }
  renderToString(<Harness />)
  return { actions, git, runAction, requestConfirm }
}

describe("repository actions", () => {
  it("uses the injected Git API for checkout, rename, tag, remote and cherry-pick", async () => {
    const { actions, git, runAction } = renderActions()
    await actions.checkoutBranch("feature")
    await actions.renameBranch("feature", " renamed ")
    await actions.createTag(" v1.0.0 ", "Release")
    await actions.addRemote(" upstream ", " /other/repo ")
    await actions.cherryPick("abc123")
    expect(git.checkout).toHaveBeenCalledWith("/repo", "feature", false)
    expect(git.branchRename).toHaveBeenCalledWith("/repo", "feature", "renamed")
    expect(git.tagCreate).toHaveBeenCalledWith("/repo", "v1.0.0", "Release")
    expect(git.remoteAdd).toHaveBeenCalledWith("/repo", "upstream", "/other/repo")
    expect(git.cherryPick).toHaveBeenCalledWith("/repo", "abc123")
    expect(runAction).toHaveBeenCalledWith(expect.any(Function), undefined, {
      loadingMessage: expect.any(String),
      successMessage: expect.any(String),
    })
  })

  it("does not delete branches or remotes or perform a hard reset when confirmation is declined", async () => {
    const { actions, git, runAction, requestConfirm } = renderActions(false)
    await actions.deleteBranch("feature")
    await actions.removeRemote("origin")
    await actions.resetBranch("abc123", "hard")
    expect(requestConfirm).toHaveBeenCalledTimes(3)
    expect(runAction).not.toHaveBeenCalled()
    expect(git.branchDelete).not.toHaveBeenCalled()
    expect(git.remoteRemove).not.toHaveBeenCalled()
    expect(git.reset).not.toHaveBeenCalled()
  })

  it("stashes local changes before switching branches after confirmation", async () => {
    const { actions, git, requestConfirm } = renderActions()
    git.status.mockResolvedValue({ files: [{ path: "f.tsx" }] })

    await actions.checkoutBranch("feature")

    expect(requestConfirm).toHaveBeenCalledTimes(1)
    expect(git.stash).toHaveBeenCalledWith("/repo", "Reflog: before checkout feature")
    expect(git.checkout).toHaveBeenCalledWith("/repo", "feature", false)
    expect(git.stash.mock.invocationCallOrder[0]).toBeLessThan(git.checkout.mock.invocationCallOrder[0])
  })

  it("does not switch branches when saving local changes is declined", async () => {
    const { actions, git, requestConfirm } = renderActions(false)
    git.status.mockResolvedValue({ files: [{ path: "f.tsx" }] })

    await actions.checkoutBranch("feature")

    expect(requestConfirm).toHaveBeenCalledTimes(1)
    expect(git.stash).not.toHaveBeenCalled()
    expect(git.checkout).not.toHaveBeenCalled()
  })

  it("preserves the force flag and reset mode after confirmation", async () => {
    const { actions, git } = renderActions()
    await actions.deleteBranch("feature", true)
    await actions.resetBranch("abc123", "hard")
    expect(git.branchDelete).toHaveBeenCalledWith("/repo", "feature", true)
    expect(git.reset).toHaveBeenCalledWith("/repo", "abc123", "hard")
  })

  it("skips empty names and keeps soft reset free of destructive confirmation", async () => {
    const { actions, git, requestConfirm } = renderActions()
    await actions.renameBranch("feature", " ")
    await actions.createTag(" ")
    await actions.addRemote("origin", " ")
    await actions.resetBranch("abc123", "soft")
    expect(git.branchRename).not.toHaveBeenCalled()
    expect(git.tagCreate).not.toHaveBeenCalled()
    expect(git.remoteAdd).not.toHaveBeenCalled()
    expect(requestConfirm).not.toHaveBeenCalled()
    expect(git.reset).toHaveBeenCalledWith("/repo", "abc123", "soft")
  })
})
