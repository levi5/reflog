import { _pipe } from "funcio"
import { useCallback } from "react"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { RepositoryActionDeps } from "./action-types"
import { useGitAction } from "./useGitAction"

export function useRemoteOps(deps: RepositoryActionDeps) {
  const { lang, repo, runAction, requestConfirm, git = defaultGitApi } = deps
  const gitAction = useGitAction(lang, runAction)

  const addRemote = useCallback(
    (name: string, url: string) => {
      const cleanName = _pipe(name, (s: string) => s.trim())
      const cleanUrl = _pipe(url, (s: string) => s.trim())
      if (!repo || !cleanName || !cleanUrl) return Promise.resolve()
      return gitAction(() => git.remoteAdd(repo, cleanName, cleanUrl), "addRemoteLoading", "addRemoteSuccess")
    },
    [git, repo, gitAction],
  )

  const removeRemote = useCallback(
    async (name: string) => {
      if (!repo || !name) return Promise.resolve()
      const confirmed = await requestConfirm(t(lang, "removeRemote"), t(lang, "confirmRemoveRemote"))
      if (!confirmed) return Promise.resolve()
      return gitAction(() => git.remoteRemove(repo, name), "removeRemoteLoading", "removeRemoteSuccess")
    },
    [git, repo, lang, gitAction, requestConfirm],
  )

  return {
    addRemote,
    removeRemote,
  }
}
