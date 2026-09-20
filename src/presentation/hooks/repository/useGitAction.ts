import { useCallback } from "react"
import { type StringKey, t } from "../../../i18n"
import type { Lang } from "../../../types"
import type { RunAction } from "./action-types"

export function useGitAction(lang: Lang, runAction: RunAction) {
  return useCallback(
    (work: () => Promise<unknown>, loadingKey: StringKey, successKey: StringKey) =>
      runAction(work, undefined, {
        loadingMessage: t(lang, loadingKey),
        successMessage: t(lang, successKey),
      }),
    [lang, runAction],
  )
}
