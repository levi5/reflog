import { _Either } from "funcio"
import { useCallback } from "react"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { RepositoryActionDeps } from "./action-types"
import { useGitAction } from "./useGitAction"

export function useGitActions(deps: RepositoryActionDeps) {
  const { lang, repo, runAction, requestConfirm, git = defaultGitApi } = deps

  const gitAction = useGitAction(lang, runAction)

  const cherryPick = useCallback(
    (hash: string) => {
      if (!repo || !hash) return Promise.resolve()
      return gitAction(() => git.cherryPick(repo, hash), "cherryPicking", "cherryPickSuccess")
    },
    [git, repo, gitAction],
  )

  const cherryPickContinue = useCallback(
    () => gitAction(() => git.cherryPickContinue(repo), "cherryPicking", "cherryPickSuccess"),
    [git, repo, gitAction],
  )

  const cherryPickAbort = useCallback(
    () => gitAction(() => git.cherryPickAbort(repo), "actionProcessing", "actionSuccess"),
    [git, repo, gitAction],
  )

  const revert = useCallback(
    (hash: string) => {
      if (!repo || !hash) return Promise.resolve()
      return gitAction(() => git.revert(repo, hash), "reverting", "revertSuccess")
    },
    [git, repo, gitAction],
  )

  const revertContinue = useCallback(
    () => gitAction(() => git.revertContinue(repo), "reverting", "revertSuccess"),
    [git, repo, gitAction],
  )

  const revertAbort = useCallback(
    () => gitAction(() => git.revertAbort(repo), "actionProcessing", "actionSuccess"),
    [git, repo, gitAction],
  )

  const resetBranch = useCallback(
    async (target: string, mode: "soft" | "mixed" | "hard" = "mixed") => {
      if (!repo || !target) return Promise.resolve()
      if (mode === "hard") {
        const confirmed = await requestConfirm(t(lang, "resetToCommit"), t(lang, "resetConfirm"))
        if (!confirmed) return Promise.resolve()
      }
      const resolved = await _Either.try.async(() => git.run(repo, ["rev-parse", "HEAD"]))
      const prevHead = resolved.isRight()
        ? String(resolved.value ?? "")
            .trim()
            .split("\n")[0]
        : ""
      return runAction(() => git.reset(repo, target, mode), undefined, {
        loadingMessage: t(lang, "actionProcessing"),
        successMessage: t(lang, "actionSuccess"),
        successDuration: prevHead ? 8000 : undefined,
        successAction: prevHead
          ? {
              label: t(lang, "undo"),
              onAction: () => {
                void runAction(() => git.reset(repo, prevHead, mode), undefined, {
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

  return {
    cherryPick,
    cherryPickContinue,
    cherryPickAbort,
    revert,
    revertContinue,
    revertAbort,
    resetBranch,
  }
}
