import { useCallback, useEffect, useState } from "react"
import { t } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import type { Lang, WorktreeInfo } from "../../../types"
import type { RunAction } from "./action-types"

export function useWorktreeOps({ lang, repo, runAction }: { lang: Lang; repo: string; runAction: RunAction }) {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([])

  const loadWorktrees = useCallback(async () => {
    if (!repo) return
    try {
      setWorktrees(await gitApi.worktrees(repo))
    } catch {
      setWorktrees([])
    }
  }, [repo])

  useEffect(() => {
    void loadWorktrees()
  }, [loadWorktrees])

  const addWorktree = useCallback(
    (path: string, branch?: string, detach = false) => {
      if (!repo || !path.trim()) return Promise.resolve()
      return runAction(
        () => gitApi.worktreeAdd(repo, path.trim(), branch?.trim() || undefined, detach),
        loadWorktrees,
        {
          loadingMessage: t(lang, "worktreeAdding"),
          successMessage: t(lang, "worktreeAdded"),
        },
      )
    },
    [repo, runAction, lang, loadWorktrees],
  )

  const removeWorktree = useCallback(
    (path: string, force = false) => {
      if (!repo || !path) return Promise.resolve()
      return runAction(() => gitApi.worktreeRemove(repo, path, force), loadWorktrees, {
        loadingMessage: t(lang, "worktreeRemoving"),
        successMessage: t(lang, "worktreeRemoved"),
      })
    },
    [repo, runAction, lang, loadWorktrees],
  )

  return { worktrees, loadWorktrees, addWorktree, removeWorktree }
}
