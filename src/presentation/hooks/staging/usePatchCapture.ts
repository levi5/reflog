import { _Either } from "funcio"
import { useCallback } from "react"
import { gitApi } from "../../../infrastructure/git"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"
import type { RunAction } from "../repository/action-types"

export interface CapturedPatch {
  file: string
  patch: string
}

interface PatchCaptureOptions {
  lang: Lang
  repo: string
  runAction: RunAction
  reloadDiff: () => void
}

export function usePatchCapture({ lang, repo, runAction, reloadDiff }: PatchCaptureOptions) {
  const capturePatches = useCallback(
    async (files: string[], staged: boolean): Promise<CapturedPatch[]> => {
      const captured = await Promise.all(
        files.map(async (file) => {
          const result = await _Either.try.async(() => gitApi.diff(repo, file, staged))
          const patch = result.isRight() ? String(result.value ?? "") : ""
          return patch.trim() ? { file, patch } : null
        }),
      )
      return captured.filter((entry): entry is CapturedPatch => entry !== null)
    },
    [repo],
  )

  const reapplyPatches = useCallback(
    (entries: CapturedPatch[], cached: boolean) =>
      runAction(
        async () => {
          const failed: string[] = []
          for (const entry of entries) {
            const applied = await _Either.try.async(() => gitApi.applyPatch(repo, entry.patch, cached, false))
            if (applied.isLeft()) failed.push(entry.file)
          }
          if (failed.length > 0) {
            throw new Error(`${t(lang, "partialRollbackFailed")}: ${failed.join(", ")}`)
          }
          return ""
        },
        reloadDiff,
        {
          loadingMessage: t(lang, "actionProcessing"),
          successMessage: t(lang, "actionSuccess"),
        },
      ),
    [repo, lang, runAction, reloadDiff],
  )

  return { capturePatches, reapplyPatches }
}
