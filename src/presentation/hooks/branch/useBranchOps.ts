import { _Either, _pipe } from "funcio"
import { useCallback } from "react"
import { formatMessage, t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { RepositoryActionDeps } from "../repository/action-types"
import { useGitAction } from "../repository/useGitAction"

export function useBranchOps(deps: RepositoryActionDeps) {
  const { lang, repo, runAction, requestConfirm, git = defaultGitApi } = deps
  const gitAction = useGitAction(lang, runAction)

  const restoreBranches = useCallback(
    (tips: { name: string; hash: string }[]) =>
      runAction(
        async () => {
          for (const tip of tips) await git.run(repo, ["branch", tip.name, tip.hash])
          return ""
        },
        undefined,
        {
          loadingMessage: t(lang, "actionProcessing"),
          successMessage: t(lang, "actionSuccess"),
        },
      ),
    [git, repo, lang, runAction],
  )

  const checkoutBranch = useCallback(
    async (branch: string) => {
      if (!repo || !branch) return Promise.resolve()
      const status = await git.status(repo)
      if (status.files.length === 0) {
        return gitAction(() => git.checkout(repo, branch, false), "checkoutBranchLoading", "checkoutBranchSuccess", {
          vars: { branch },
        })
      }
      const confirmed = await requestConfirm(t(lang, "checkoutWithChanges"), t(lang, "checkoutWithChangesHint"))
      if (!confirmed) return Promise.resolve()
      return runAction(
        async () => {
          await git.stash(repo, `Reflog: before checkout ${branch}`)
          return git.checkout(repo, branch, false)
        },
        undefined,
        {
          loadingMessage: t(lang, "checkoutStashing"),
          successMessage: t(lang, "checkoutStashed"),
        },
      )
    },
    [git, repo, lang, gitAction, requestConfirm, runAction],
  )

  const createBranchFrom = useCallback(
    (name: string, from: string) => {
      const trimmedName = name.trim()
      const trimmedFrom = from.trim()
      if (!repo || !trimmedName) return Promise.resolve()
      return gitAction(
        () => git.checkout(repo, trimmedName, true, trimmedFrom === "" ? undefined : trimmedFrom),
        "createBranchLoading",
        "createBranchSuccess",
        { vars: { branch: trimmedName } },
      )
    },
    [repo, git, gitAction],
  )

  const deleteBranch = useCallback(
    async (name: string, force = false) => {
      if (!repo || !name) return Promise.resolve()
      const confirmed = await requestConfirm(
        t(lang, "deleteBranch"),
        force ? formatMessage(lang, "confirmForceDeleteBranch", { name }) : t(lang, "confirmDeleteBranch"),
      )
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
        undoLabel: formatMessage(lang, "undoDeleteBranch", { name }),
        undo: tipHash ? () => restoreBranches([{ name, hash: tipHash }]) : undefined,
      })
    },
    [git, repo, lang, runAction, requestConfirm, restoreBranches],
  )

  const deleteBranches = useCallback(
    async (names: string[], force = false) => {
      if (!repo || names.length === 0) return Promise.resolve()
      const confirmed = await requestConfirm(
        t(lang, "deleteBranch"),
        formatMessage(lang, force ? "confirmForceDeleteBranches" : "confirmDeleteBranches", { count: names.length }),
      )
      if (!confirmed) return Promise.resolve()
      const tips: { name: string; hash: string }[] = []
      for (const name of names) {
        const resolved = await _Either.try.async(() => git.run(repo, ["rev-parse", name]))
        const tipHash = resolved.isRight()
          ? String(resolved.value ?? "")
              .trim()
              .split("\n")[0]
          : ""
        if (tipHash) tips.push({ name, hash: tipHash })
      }
      const failed: string[] = []
      return runAction(
        async () => {
          for (const name of names) {
            const deleted = await _Either.try.async(() => git.branchDelete(repo, name, force))
            if (deleted.isLeft()) failed.push(name)
          }
          if (failed.length > 0) {
            throw new Error(formatMessage(lang, "partialBranchDeleteFailed", { names: failed.join(", ") }))
          }
          return ""
        },
        undefined,
        {
          loadingMessage: t(lang, "deleteBranchesLoading"),
          successMessage: formatMessage(lang, "deleteBranchesSuccess", { count: names.length }),
          successDuration: tips.length > 0 ? 8000 : undefined,
          undoLabel: formatMessage(lang, "undoDeleteBranches", { count: names.length }),
          undo: tips.length > 0 ? () => restoreBranches(tips) : undefined,
        },
      )
    },
    [git, repo, lang, runAction, requestConfirm, restoreBranches],
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
    createBranchFrom,
    deleteBranch,
    deleteBranches,
    renameBranch,
  }
}
