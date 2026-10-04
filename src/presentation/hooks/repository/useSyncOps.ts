import { useCallback } from "react"
import type { IGitApi } from "../../../infrastructure/git/types"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"

import { useGitAction } from "./useGitAction"
import type { RunAction } from "./action-types"

interface SyncOpsDeps {
  lang: Lang
  repo: string
  git: IGitApi
  runAction: RunAction
}

export function useSyncOps({ lang, repo, git, runAction }: SyncOpsDeps) {
  const gitAction = useGitAction(lang, runAction)

  const pullIt = useCallback(() => gitAction(() => git.pull(repo), "pulling", "pulled"), [repo, git, gitAction])

  const pushIt = useCallback(
    () => gitAction(() => git.push(repo).then((output) => output || "pushed"), "pushing", "pushed"),
    [repo, git, gitAction],
  )

  const pushForce = useCallback(
    () =>
      gitAction(
        () => git.pushWith(repo, { force: true }).then((output) => output || "pushed"),
        "pushing",
        "pushForceSuccess",
        { errorMessage: t(lang, "pushForceFailed") },
      ),
    [repo, git, gitAction, lang],
  )

  const pushTags = useCallback(
    () =>
      gitAction(
        () => git.pushWith(repo, { tags: true }).then((output) => output || "pushed"),
        "pushingTags",
        "pushTagsSuccess",
      ),
    [repo, git, gitAction],
  )

  const deleteRemoteBranch = useCallback(
    (remoteBranch: string) =>
      gitAction(
        () => git.pushWith(repo, { deleteRemoteBranch: remoteBranch }).then((output) => output || "deleted"),
        "deletingRemoteBranch",
        "deleteRemoteBranchSuccess",
      ),
    [repo, git, gitAction],
  )

  const setUpstream = useCallback(
    (remote: string, branch: string) =>
      gitAction(() => git.setUpstream(repo, remote, branch), "settingUpstream", "setUpstreamSuccess"),
    [repo, git, gitAction],
  )

  const fetchPrune = useCallback(
    (prune = true) =>
      gitAction(
        () => git.fetch(repo, prune).then((output) => output.trim() || "fetched"),
        prune ? "fetchPrune" : "fetch",
        "fetchCompleted",
      ),
    [repo, git, gitAction],
  )

  const fetchFromRemote = useCallback(
    (remote: string, prune: boolean, tags: boolean) =>
      gitAction(
        () => git.fetchRef(repo, remote, prune, tags).then((output) => output.trim() || "fetched"),
        "fetch",
        "fetchCompleted",
      ),
    [repo, git, gitAction],
  )

  return { pullIt, pushIt, pushForce, pushTags, deleteRemoteBranch, setUpstream, fetchPrune, fetchFromRemote }
}
