import { _Either } from "funcio"
import { useCallback } from "react"
import { gitApi } from "../../../infrastructure/git"
import { formatMessage, t } from "../../../i18n"
import type { FileStatus, Lang } from "../../../types"
import { isUntrackedFile } from "../../components/Status/Sections/section-groups"

import type { RunAction } from "../repository/action-types"
import { type CapturedPatch, usePatchCapture } from "./usePatchCapture"

interface IndexOpsDeps {
  lang: Lang
  repo: string
  runAction: RunAction
  requestConfirm: (title: string, message: string) => Promise<boolean>
  loadDiff: (file?: string, staged?: boolean) => Promise<void>
  reloadDiff: () => void
  clearDiffIfSelected: (file: string) => void
}

export function useStagingIndexOps({
  lang,
  repo,
  runAction,
  requestConfirm,
  loadDiff,
  reloadDiff,
  clearDiffIfSelected,
}: IndexOpsDeps) {
  const stageFile = useCallback(
    (file: string) =>
      runAction(
        () => gitApi.add(repo, [file]),
        () => loadDiff(file, true),
        {
          loadingMessage: t(lang, "stageFileLoading"),
          successMessage: t(lang, "stageFileSuccess"),
        },
      ),
    [repo, runAction, loadDiff, lang],
  )

  const unstageFile = useCallback(
    (file: string) =>
      runAction(
        () => gitApi.unstage(repo, file),
        () => loadDiff(file, false),
        {
          loadingMessage: t(lang, "unstageFileLoading"),
          successMessage: t(lang, "unstageFileSuccess"),
        },
      ),
    [repo, runAction, loadDiff, lang],
  )

  const deleteUntrackedEntries = useCallback(
    async (entries: FileStatus[]) => {
      if (!repo || entries.length === 0) return Promise.resolve()
      const paths = entries.map((entry) => entry.path)
      return runAction(
        async () => {
          for (const entry of entries) {
            if (!entry.staged) continue
            const unstaged = await _Either.try.async(() => gitApi.unstage(repo, entry.path))
            if (unstaged.isLeft()) throw unstaged.value
          }
          return gitApi.discardUntracked(repo, paths)
        },
        () => {
          for (const path of paths) clearDiffIfSelected(path)
        },
        {
          loadingMessage: t(lang, "deleteUntrackedLoading"),
          successMessage: formatMessage(lang, "deleteUntrackedSuccess", { count: paths.length }),
        },
      )
    },
    [repo, runAction, clearDiffIfSelected, lang],
  )

  const discardFile = useCallback(
    async (file: FileStatus) => {
      if (!repo || !file.path) return Promise.resolve()
      if (isUntrackedFile(file)) {
        const accepted = await requestConfirm(
          t(lang, "delete"),
          formatMessage(lang, "deleteUntrackedConfirm", { file: file.path }),
        )
        if (!accepted) return Promise.resolve()
        return deleteUntrackedEntries([file])
      }
      if (!(await requestConfirm(t(lang, "discard"), t(lang, "discardConfirm")))) return Promise.resolve()
      const captured = await _Either.try.async(() => gitApi.diff(repo, file.path, false))
      const undoPatch = captured.isRight() ? String(captured.value ?? "") : ""
      return runAction(
        () => gitApi.discard(repo, file.path),
        () => loadDiff(file.path, false),
        {
          loadingMessage: t(lang, "discardFileLoading"),
          successMessage: t(lang, "discardFileSuccess"),
          successDuration: undoPatch.trim() ? 8000 : undefined,
          undoLabel: formatMessage(lang, "undoDiscardFile", { file: file.path }),
          undo: undoPatch.trim()
            ? () =>
                runAction(
                  () => gitApi.applyPatch(repo, undoPatch, false, false),
                  () => loadDiff(file.path, false),
                  {
                    loadingMessage: t(lang, "actionProcessing"),
                    successMessage: t(lang, "actionSuccess"),
                  },
                )
            : undefined,
        },
      )
    },
    [repo, lang, requestConfirm, deleteUntrackedEntries, runAction, loadDiff],
  )

  const stageAll = useCallback(
    () =>
      runAction(() => gitApi.add(repo, []), undefined, {
        loadingMessage: t(lang, "staging"),
        successMessage: t(lang, "stageSuccess"),
      }),
    [repo, runAction, lang],
  )

  const stageFiles = useCallback(
    (files: string[]) => {
      if (!repo || files.length === 0) return Promise.resolve()
      return runAction(() => gitApi.add(repo, files), reloadDiff, {
        loadingMessage: t(lang, "staging"),
        successMessage: t(lang, "stageSuccess"),
      })
    },
    [repo, runAction, reloadDiff, lang],
  )

  const { capturePatches, reapplyPatches } = usePatchCapture({ lang, repo, runAction, reloadDiff })

  const unstageFiles = useCallback(
    (files: string[]) => {
      if (!repo || files.length === 0) return Promise.resolve()
      let undoPatches: CapturedPatch[] = []
      return runAction(
        async () => {
          const captured = await capturePatches(files, true)
          undoPatches = captured
          const failed: string[] = []
          for (const file of files) {
            const result = await _Either.try.async(() => gitApi.unstage(repo, file))
            if (result.isLeft()) failed.push(file)
          }
          if (failed.length > 0) {
            const applied = await Promise.allSettled(
              undoPatches.map((entry) => gitApi.applyPatch(repo, entry.patch, true, true)),
            )
            const notRestored = undoPatches
              .filter((_entry, patchIndex) => applied[patchIndex].status === "rejected")
              .map((entry) => entry.file)
            throw new Error(
              notRestored.length > 0
                ? `${t(lang, "partialRollbackFailed")}: ${[...failed, ...notRestored].join(", ")}`
                : `${t(lang, "partialFailureRolledBack")}: ${failed.join(", ")}`,
            )
          }
          return ""
        },
        reloadDiff,
        {
          loadingMessage: t(lang, "unstaging"),
          successMessage: t(lang, "unstageSuccess"),
          successDuration: 8000,
          undoLabel: formatMessage(lang, "undoUnstageFiles", { count: files.length }),
          undo: () => reapplyPatches(undoPatches, true),
        },
      )
    },
    [repo, runAction, capturePatches, reloadDiff, reapplyPatches, lang],
  )

  const discardFiles = useCallback(
    async (entries: FileStatus[]) => {
      if (!repo || entries.length === 0) return Promise.resolve()
      const toDelete = entries.filter(isUntrackedFile)
      const toRestore = entries.filter((entry) => !isUntrackedFile(entry))
      const confirmKey =
        toDelete.length === 0
          ? "discardSelectedConfirm"
          : toRestore.length === 0
            ? "deleteUntrackedSelectedConfirm"
            : "deleteUntrackedMixedConfirm"
      const confirmMessage =
        toDelete.length > 0 && toRestore.length > 0
          ? formatMessage(lang, confirmKey, { count: toDelete.length, restores: toRestore.length })
          : confirmKey === "discardSelectedConfirm"
            ? t(lang, confirmKey)
            : formatMessage(lang, confirmKey, { count: toDelete.length })
      const accepted = await requestConfirm(t(lang, toDelete.length > 0 ? "delete" : "discard"), confirmMessage)
      if (!accepted) return Promise.resolve()
      let undoPatches: CapturedPatch[] = []
      const deleting = toDelete.length > 0
      return runAction(
        async () => {
          if (deleting) {
            for (const entry of toDelete) {
              if (!entry.staged) continue
              const unstaged = await _Either.try.async(() => gitApi.unstage(repo, entry.path))
              if (unstaged.isLeft()) throw unstaged.value
            }
            await gitApi.discardUntracked(
              repo,
              toDelete.map((entry) => entry.path),
            )
          }
          if (toRestore.length === 0) return ""
          const captured = await capturePatches(
            toRestore.map((entry) => entry.path),
            false,
          )
          undoPatches = captured
          const failed: string[] = []
          for (const entry of toRestore) {
            const result = await _Either.try.async(() => gitApi.discard(repo, entry.path))
            if (result.isLeft()) failed.push(entry.path)
          }
          if (failed.length > 0) {
            const applied = await Promise.allSettled(
              undoPatches.map((entry) => gitApi.applyPatch(repo, entry.patch, false, false)),
            )
            const notRestored = undoPatches
              .filter((_entry, patchIndex) => applied[patchIndex].status === "rejected")
              .map((entry) => entry.file)
            throw new Error(
              notRestored.length > 0
                ? `${t(lang, "partialRollbackFailed")}: ${[...failed, ...notRestored].join(", ")}`
                : `${t(lang, "partialFailureRolledBack")}: ${failed.join(", ")}`,
            )
          }
          return ""
        },
        () => {
          for (const entry of toDelete) clearDiffIfSelected(entry.path)
          reloadDiff()
        },
        {
          loadingMessage: deleting ? t(lang, "deleteUntrackedLoading") : t(lang, "discarding"),
          successMessage: deleting
            ? formatMessage(lang, "deleteUntrackedSuccess", { count: toDelete.length })
            : t(lang, "discarded"),
          successDuration: toRestore.length > 0 ? 8000 : undefined,
          undoLabel:
            toRestore.length > 0 ? formatMessage(lang, "undoDiscardFiles", { count: toRestore.length }) : undefined,
          undo: toRestore.length > 0 ? () => reapplyPatches(undoPatches, false) : undefined,
        },
      )
    },
    [repo, lang, requestConfirm, runAction, capturePatches, reloadDiff, reapplyPatches, clearDiffIfSelected],
  )

  return {
    stageFile,
    unstageFile,
    discardFile,
    stageAll,
    stageFiles,
    unstageFiles,
    discardFiles,
  }
}
