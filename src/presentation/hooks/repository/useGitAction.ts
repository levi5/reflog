import { useCallback } from "react"
import { type MessageVars, type StringKey, formatMessage } from "../../../i18n"
import type { Lang } from "../../../types"
import type { RunAction } from "./action-types"

export function useGitAction(lang: Lang, runAction: RunAction) {
  return useCallback(
    (
      work: () => Promise<unknown>,
      loadingKey: StringKey,
      successKey: StringKey,
      options?: { errorMessage?: string; vars?: MessageVars },
    ) =>
      runAction(work, undefined, {
        loadingMessage: formatMessage(lang, loadingKey, options?.vars),
        successMessage: formatMessage(lang, successKey, options?.vars),
        errorMessage: options?.errorMessage,
      }),
    [lang, runAction],
  )
}
