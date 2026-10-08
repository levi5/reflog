import { _Either } from "funcio"
import { useCallback, useState } from "react"
import type { Lang, StashItem } from "../../../types"
import { formatMessage, t } from "../../../i18n"
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
  const [stashKeepIndex, setStashKeepIndex] = useState(false)
  const [stashStagedOnly, setStashStagedOnly] = useState(false)
  const [stashPaths, setStashPaths] = useState("")

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
    const paths = stashPaths
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    if (stashKeepIndex && stashStagedOnly) {
      setMsg(t(lang, "stashKeepStagedConflict"))
      return Promise.resolve()
    }
    return runAction(
      () =>
        gitApi
          .stash(repo, message, { keepIndex: stashKeepIndex, stagedOnly: stashStagedOnly, paths })
          .then((output) => output || "stashed"),
      () => {
        setStashMsg("")
        setStashPaths("")
        void loadStashes()
      },
      {
        loadingMessage: t(lang, "stashing"),
        successMessage: t(lang, "stashed"),
      },
    )
  }, [repo, stashMsg, stashPaths, stashKeepIndex, stashStagedOnly, lang, runAction, loadStashes, setMsg])

  const stashPopIt = useCallback(
    (index?: number) =>
      runAction(
        () => gitApi.stashPop(repo, index).then((output) => output || "stash pop"),
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

  const restoreStash = useCallback(
    async (item: StashItem) => {
      if (!repo) return
      const patch = await gitApi.stashShow(repo, item.index)
      if (!patch.trim()) return
      await runAction(() => gitApi.applyPatch(repo, patch, false, false), loadStashes, {
        loadingMessage: t(lang, "actionProcessing"),
        successMessage: t(lang, "actionSuccess"),
      })
    },
    [repo, lang, runAction, loadStashes],
  )

  const stashDrop = useCallback(
    async (index: number) => {
      if (!repo) return Promise.resolve()
      const entry = stashes.find((item) => item.index === index)
      const warning = t(lang, "stashDropConfirmIrreversible").replace(
        "{selector}",
        entry?.selector ?? `stash@{${index}}`,
      )
      if (!(await requestConfirm(t(lang, "stashDrop"), warning))) return Promise.resolve()
      return runAction(() => gitApi.stashDrop(repo, index), loadStashes, {
        loadingMessage: t(lang, "actionProcessing"),
        successMessage: t(lang, "actionSuccess"),
        undoLabel: formatMessage(lang, "undoStashDrop", { selector: entry?.selector ?? `stash@{${index}}` }),
        undo: entry ? () => restoreStash(entry) : undefined,
      })
    },
    [repo, lang, stashes, runAction, requestConfirm, loadStashes, restoreStash],
  )

  const stashShow = useCallback((index: number) => (repo ? gitApi.stashShow(repo, index) : Promise.resolve("")), [repo])

  const stashClear = useCallback(async () => {
    if (!repo) return Promise.resolve()
    if (!(await requestConfirm(t(lang, "stashClear"), t(lang, "stashClearConfirm")))) return Promise.resolve()
    return runAction(() => gitApi.stashClear(repo), loadStashes, {
      loadingMessage: t(lang, "stashClearing"),
      successMessage: t(lang, "stashCleared"),
    })
  }, [repo, lang, runAction, requestConfirm, loadStashes])

  const stashBranch = useCallback(
    (index: number, branch: string) => {
      const name = branch.trim()
      if (!repo || !name) return Promise.resolve()
      return runAction(() => gitApi.stashBranch(repo, name, index), loadStashes, {
        loadingMessage: t(lang, "stashBranching"),
        successMessage: t(lang, "stashBranched"),
      })
    },
    [repo, lang, runAction, loadStashes],
  )

  const stashApplyFile = useCallback(
    (index: number, file: string) => {
      const path = file.trim()
      if (!repo || !path) return Promise.resolve()
      return runAction(() => gitApi.stashApplyFile(repo, index, path), loadStashes, {
        loadingMessage: t(lang, "actionProcessing"),
        successMessage: t(lang, "actionSuccess"),
      })
    },
    [repo, lang, runAction, loadStashes],
  )

  return {
    stashes,
    stashMsg,
    setStashMsg,
    stashKeepIndex,
    setStashKeepIndex,
    stashStagedOnly,
    setStashStagedOnly,
    stashPaths,
    setStashPaths,
    loadStashes,
    stashPush,
    stashPopIt,
    stashClear,
    stashApply,
    stashBranch,
    stashApplyFile,
    stashDrop,
    stashShow,
  }
}
