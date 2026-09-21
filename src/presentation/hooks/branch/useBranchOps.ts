import { _Either, _pipe } from "funcio"
import { useCallback } from "react"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { RepositoryActionDeps } from "../repository/action-types"
import { useGitAction } from "../repository/useGitAction"

export function useBranchOps(deps: RepositoryActionDeps) {
  const { lang, repo, runAction, requestConfirm, git = defaultGitApi } = deps
  const gitAction = useGitAction(lang, runAction)

  const checkoutBranch = useCallback(
    (branch: string) =>
      gitAction(() => git.checkout(repo, branch, false), "checkoutBranchLoading", "checkoutBranchSuccess"),
    [git, repo, gitAction],
  )

  const deleteBranch = useCallback(
    async (name: string, force = false) => {
      if (!repo || !name) return Promise.resolve()
      const confirmed = await requestConfirm(t(lang, "deleteBranch"), t(lang, "confirmDeleteBranch"))
      if (!confirmed) return Promise.resolve()
      const resolved = await _Either.try.async(() => git.run(repo, ["rev-parse", name]))
      const tipHash = resolved.isRight()
        ? String(resolved.value ?? "")
            .trim()
            .split("\n")[0]
        : ""
      return runAction(() => git.branchDelete(repo, name, force), undefined, {
        loadingMessage: t(lang, "deleteBranchLoading"),
        successMessage: t(lang, "deleteBranchSuccess"),
        successDuration: tipHash ? 8000 : undefined,
        successAction: tipHash
          ? {
              label: t(lang, "undo"),
              onAction: () => {
                void runAction(() => git.run(repo, ["branch", name, tipHash]), undefined, {
                  loadingMessage: t(lang, "actionProcessing"),
                  successMessage: t(lang, "actionSuccess"),
                })
              },
            }
          : undefined,
      })
    },
    [git, repo, lang, runAction, requestConfirm],
  )

  const renameBranch = useCallback(
    (oldName: string, newName: string) => {
      const cleanNewName = _pipe(newName, (s: string) => s.trim())
      if (!repo || !oldName || !cleanNewName) return Promise.resolve()
      return gitAction(
        () => git.branchRename(repo, oldName, cleanNewName),
        "renameBranchLoading",
        "renameBranchSuccess",
      )
    },
    [git, repo, gitAction],
  )

  return {
    checkoutBranch,
    deleteBranch,
    renameBranch,
  }
}
