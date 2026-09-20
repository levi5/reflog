import { _pipe } from "funcio"
import { useCallback } from "react"
import { t } from "../../../i18n"
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
      return gitAction(() => git.tagDelete(repo, name), "deleteTagLoading", "deleteTagSuccess")
    },
    [git, repo, lang, gitAction, requestConfirm],
  )

  return {
    createTag,
    deleteTag,
  }
}
