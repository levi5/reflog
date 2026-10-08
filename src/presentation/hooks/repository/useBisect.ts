import { useCallback, useState } from "react"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import type { Lang } from "../../../types"
import type { RunAction } from "./action-types"

interface BisectDeps {
  lang: Lang
  repo: string
  runAction: RunAction
  git?: IGitApi
}

export function useBisect({ lang, repo, runAction, git = defaultGitApi }: BisectDeps) {
  const [log, setLog] = useState("")

  const start = useCallback(
    (bad: string, good: string) => {
      if (!repo || !bad.trim() || !good.trim()) return Promise.resolve()
      return runAction(() => git.bisectStart(repo, bad.trim(), good.trim()), undefined, {
        loadingMessage: t(lang, "bisectStarting"),
        successMessage: t(lang, "bisectStarted"),
      })
    },
    [repo, git, runAction, lang],
  )

  const mark = useCallback(
    (kind: "good" | "bad", rev?: string) => {
      if (!repo) return Promise.resolve()
      const command = kind === "good" ? git.bisectGood : git.bisectBad
      return runAction(() => command(repo, rev), undefined, {
        loadingMessage: t(lang, kind === "good" ? "bisectMarkingGood" : "bisectMarkingBad"),
        successMessage: t(lang, "bisectMarked"),
      })
    },
    [repo, git.bisectGood, git.bisectBad, runAction, lang],
  )

  const skip = useCallback(
    () =>
      runAction(() => git.bisectSkip(repo), undefined, {
        loadingMessage: t(lang, "bisectSkipping"),
        successMessage: t(lang, "bisectSkipped"),
      }),
    [repo, git, runAction, lang],
  )

  const reset = useCallback(
    () =>
      runAction(
        () => git.bisectReset(repo),
        () => setLog(""),
        {
          loadingMessage: t(lang, "bisectResetting"),
          successMessage: t(lang, "bisectReset"),
        },
      ),
    [repo, git, runAction, lang],
  )

  const loadLog = useCallback(async () => {
    if (!repo) return
    try {
      setLog(await git.bisectLog(repo))
    } catch {
      setLog("")
    }
  }, [repo, git])

  return { log, start, mark, skip, reset, loadLog }
}
