import { _Either } from "funcio"
import { useCallback, useState } from "react"
import type { Lang, StashItem } from "../../../types"
import { t } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import type { RunAction } from "../repository/action-types"

export interface StashOpsDeps {
  lang: Lang
  repo: string
  runAction: RunAction
  requestConfirm: (title: string, message: string) => Promise<boolean>
  setMsg: (m: string) => void
}

export function useStashOps(deps: StashOpsDeps) {
  const { lang, repo, runAction, requestConfirm, setMsg } = deps
  const [stashes, setStashes] = useState<StashItem[]>([])
  const [stashMsg, setStashMsg] = useState("")

  const loadStashes = useCallback(async () => {
    if (!repo) return
    const result = await _Either.try.async(() => gitApi.stashList(repo))
    if (result.isRight()) {
      setStashes(result.value as StashItem[])
    } else {
      setMsg(String(result.value))
    }
  }, [repo, setMsg])

  const stashPush = useCallback(() => {
    if (!repo) return Promise.resolve()
    const message = stashMsg || undefined
    return runAction(
      () => gitApi.stash(repo, message).then((m) => m || "stashed"),
      () => {
        setStashMsg("")
        void loadStashes()
      },
      {
        loadingMessage: t(lang, "stashing"),
        successMessage: t(lang, "stashed"),
      },
    )
  }, [repo, stashMsg, lang, runAction, loadStashes])

  const stashPopIt = useCallback(
    () =>
      runAction(
        () => gitApi.stashPop(repo).then((m) => m || "stash pop"),
        () => void loadStashes(),
        {
          loadingMessage: t(lang, "stashPopping"),
          successMessage: t(lang, "stashPopped"),
        },
      ),
    [repo, lang, runAction, loadStashes],
  )

  const stashApply = useCallback(
    (index: number) =>
      runAction(() => gitApi.stashApply(repo, index), loadStashes, {
        loadingMessage: t(lang, "actionProcessing"),
        successMessage: t(lang, "actionSuccess"),
      }),
    [repo, lang, runAction, loadStashes],
  )

  const stashDrop = useCallback(
    async (index: number) => {
      if (!repo) return Promise.resolve()
      if (!(await requestConfirm(t(lang, "stashDrop"), t(lang, "stashDropConfirm")))) return Promise.resolve()
      return runAction(() => gitApi.stashDrop(repo, index), loadStashes, {
        loadingMessage: t(lang, "actionProcessing"),
        successMessage: t(lang, "actionSuccess"),
      })
    },
    [repo, lang, runAction, requestConfirm, loadStashes],
  )

  const stashShow = useCallback((index: number) => (repo ? gitApi.stashShow(repo, index) : Promise.resolve("")), [repo])

  return {
    stashes,
    stashMsg,
    setStashMsg,
    loadStashes,
    stashPush,
    stashPopIt,
    stashApply,
    stashDrop,
    stashShow,
  }
}
