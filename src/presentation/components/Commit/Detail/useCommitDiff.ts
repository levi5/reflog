import { useCallback, useEffect, useRef, useState } from "react"
import type { CommitFileChange } from "../../../../types"
import { MAX_DIFF_CACHE_ENTRIES } from "./constants"
import { useTranslation } from "../../../context"

export interface CommitDiffState {
  files: CommitFileChange[]
  loadingFiles: boolean
  selectedFile: string
  diffText: string
  diffError: string
  loadingDiff: boolean
  selectFile: (file: string) => void
}

interface Options {
  hash: string | null
  loadFiles?: (hash: string) => Promise<CommitFileChange[]>
  loadDiff?: (hash: string, file: string) => Promise<string>
}

function cacheDiff(cache: Map<string, string>, key: string, diff: string): void {
  cache.delete(key)
  cache.set(key, diff)
  while (cache.size > MAX_DIFF_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) break
    cache.delete(oldestKey)
  }
}

export function useCommitDiff({ hash, loadFiles, loadDiff }: Options): CommitDiffState {
  const { t } = useTranslation()
  const [files, setFiles] = useState<CommitFileChange[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState("")
  const [diffText, setDiffText] = useState("")
  const [diffError, setDiffError] = useState("")
  const [loadingDiff, setLoadingDiff] = useState(false)
  const diffCache = useRef(new Map<string, string>())
  const filesRequest = useRef(0)
  const diffRequest = useRef(0)

  const clearDiff = useCallback(() => {
    diffRequest.current += 1
    setSelectedFile("")
    setDiffText("")
    setDiffError("")
    setLoadingDiff(false)
  }, [])

  useEffect(() => {
    if (!hash) return
    clearDiff()
    setFiles([])
    setLoadingFiles(false)
    if (!loadFiles) return
    const request = filesRequest.current + 1
    filesRequest.current = request
    setLoadingFiles(true)
    void loadFiles(hash)
      .then((nextFiles) => {
        if (request === filesRequest.current) setFiles(nextFiles)
      })
      .catch(() => {
        if (request === filesRequest.current) setFiles([])
      })
      .finally(() => {
        if (request === filesRequest.current) setLoadingFiles(false)
      })
  }, [hash, loadFiles, clearDiff])

  const selectFile = useCallback(
    (file: string) => {
      const nextFile = file === selectedFile ? "" : file
      diffRequest.current += 1
      setSelectedFile(nextFile)
      setDiffText("")
      setDiffError("")
      if (!hash || !loadDiff || !nextFile) return

      const cacheKey = `${hash}:${nextFile}`
      const cached = diffCache.current.get(cacheKey)
      if (cached !== undefined) {
        setDiffText(cached)
        return
      }

      const request = diffRequest.current
      setLoadingDiff(true)
      void loadDiff(hash, nextFile)
        .then((diff) => {
          cacheDiff(diffCache.current, cacheKey, diff)
          if (request === diffRequest.current) setDiffText(diff)
        })
        .catch((error: unknown) => {
          if (request !== diffRequest.current) return
          const tooLarge = error instanceof Error && error.message.includes("limite")
          setDiffError(tooLarge ? t("diffTooLarge") : t("actionFailed"))
        })
        .finally(() => {
          if (request === diffRequest.current) setLoadingDiff(false)
        })
    },
    [hash, loadDiff, selectedFile, t],
  )

  return { files, loadingFiles, selectedFile, diffText, diffError, loadingDiff, selectFile }
}
