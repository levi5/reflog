import { _Either, _pipe } from "funcio"
import { useCallback } from "react"
import { formatMessage, t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { RepositoryActionDeps } from "./action-types"
import { useGitAction } from "./useGitAction"

export function useTagOps(deps: RepositoryActionDeps) {
  const { lang, repo, runAction, requestConfirm, git = defaultGitApi } = deps
  const gitAction = useGitAction(lang, runAction)

  const createTag = useCallback(
    (name: string, message?: string) => {
      const cleanName = _pipe(name, (s: string) => s.trim())
      if (!repo || !cleanName) return Promise.resolve()
      return gitAction(() => git.tagCreate(repo, cleanName, message), "createTagLoading", "createTagSuccess")
    },
    [git, repo, gitAction],
  )

  const deleteTag = useCallback(
    async (name: string) => {
      if (!repo || !name) return Promise.resolve()
      const confirmed = await requestConfirm(t(lang, "deleteTag"), t(lang, "confirmDeleteTag"))
      if (!confirmed) return Promise.resolve()
      const resolved = await _Either.try.async(() => git.run(repo, ["rev-parse", name]))
      const tipHash = resolved.isRight()
        ? String(resolved.value ?? "")
            .trim()
            .split("\n")[0]
        : ""
      return runAction(() => git.tagDelete(repo, name), undefined, {
        loadingMessage: t(lang, "deleteTagLoading"),
        successMessage: t(lang, "deleteTagSuccess"),
        successDuration: tipHash ? 8000 : undefined,
        undoLabel: formatMessage(lang, "undoDeleteTag", { name }),
        undo: tipHash
          ? () =>
              runAction(() => git.run(repo, ["tag", name, tipHash]), undefined, {
                loadingMessage: t(lang, "actionProcessing"),
                successMessage: t(lang, "actionSuccess"),
              })
          : undefined,
      })
    },
    [git, repo, lang, runAction, requestConfirm],
  )

  return {
    createTag,
    deleteTag,
  }
}
