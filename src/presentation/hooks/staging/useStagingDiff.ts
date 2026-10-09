import { _Either } from "funcio"
import { useCallback, useEffect, useRef, useState } from "react"
import { gitApi } from "../../../infrastructure/git"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"
import { lruSet } from "../ui/lru"
import { DIFF_CACHE_ENTRIES } from "./constants"

interface DiffDeps {
  lang: Lang
  repo: string
}

export function useStagingDiff({ lang, repo }: DiffDeps) {
  const [selectedFile, setSelectedFile] = useState("")
  const [diff, setDiff] = useState("")
  const [diffStaged, setDiffStaged] = useState(false)
  const [diffLoaded, setDiffLoaded] = useState(false)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffStale, setDiffStale] = useState(false)
  const [diffError, setDiffError] = useState<string | null>(null)
  const diffRequestRef = useRef(0)
  const diffCacheRef = useRef(new Map<string, string>())
  const hasContentRef = useRef(false)

  const cacheKeyOf = useCallback((file: string, staged: boolean) => `${repo}:${file}:${staged}`, [repo])

  const showDiff = useCallback((content: string) => {
    hasContentRef.current = content.length > 0
    setDiff(content)
    setDiffLoaded(true)
    setDiffStale(false)
  }, [])

  const clearDiff = useCallback(() => {
    hasContentRef.current = false
    setDiff("")
    setDiffLoaded(false)
    setDiffStale(false)
  }, [])

  const loadDiff = useCallback(
    async (file = selectedFile, staged = diffStaged) => {
      if (!repo || !file) return
      const request = diffRequestRef.current + 1
      diffRequestRef.current = request
      setSelectedFile(file)
      setDiffStaged(staged)
      setDiffError(null)
      setDiffStale(hasContentRef.current)

      const cacheKey = cacheKeyOf(file, staged)
      const cached = diffCacheRef.current.get(cacheKey)
      if (cached !== undefined) {
        showDiff(cached)
        setDiffLoading(false)
        return
      }

      setDiffLoading(true)
      const result = await _Either.try.async(() => gitApi.diff(repo, file, staged))
      if (request !== diffRequestRef.current) return
      setDiffLoading(false)
      if (result.isRight()) {
        const content = (result.value as string) || t(lang, "noDiff")
        lruSet(diffCacheRef.current, cacheKey, content, DIFF_CACHE_ENTRIES)
        showDiff(content)
      } else {
        clearDiff()
        setDiffError(String(result.value))
      }
    },
    [repo, lang, selectedFile, diffStaged, cacheKeyOf, showDiff, clearDiff],
  )

  useEffect(() => {
    if (!repo || !selectedFile) return
    void loadDiff(selectedFile, diffStaged)
  }, [repo, selectedFile, diffStaged, loadDiff])

  const selectDiff = useCallback(
    (file: string, staged: boolean) => {
      diffRequestRef.current += 1
      setSelectedFile(file)
      setDiffStaged(staged)
      if (!file) {
        clearDiff()
        setDiffLoading(false)
        setDiffError(null)
      }
    },
    [clearDiff],
  )

  const reloadDiff = useCallback(() => {
    if (!selectedFile) return
    diffCacheRef.current.delete(cacheKeyOf(selectedFile, diffStaged))
    void loadDiff(selectedFile, diffStaged)
  }, [selectedFile, diffStaged, cacheKeyOf, loadDiff])

  const clearDiffIfSelected = useCallback(
    (file: string) => {
      if (file !== selectedFile) return
      diffRequestRef.current += 1
      diffCacheRef.current.clear()
      clearDiff()
      setSelectedFile("")
      setDiffLoading(false)
      setDiffError(null)
    },
    [selectedFile, clearDiff],
  )

  return {
    selectedFile,
    diff,
    diffStaged,
    diffLoaded,
    diffLoading,
    diffStale,
    diffError,
    selectDiff,
    loadDiff,
    reloadDiff,
    clearDiffIfSelected,
  }
}
