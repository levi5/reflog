import { _Either } from "funcio"
import { useCallback, useRef, useState } from "react"
import { gitApi } from "../../../infrastructure/git"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"

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
  const [diffError, setDiffError] = useState<string | null>(null)
  const diffRequestRef = useRef(0)

  const selectDiff = useCallback((file: string, staged: boolean) => {
    diffRequestRef.current += 1
    setSelectedFile(file)
    setDiffStaged(staged)
    setDiff("")
    setDiffLoaded(false)
    setDiffLoading(false)
    setDiffError(null)
  }, [])

  const loadDiff = useCallback(
    async (file = selectedFile, staged = diffStaged) => {
      if (!repo) return
      const request = diffRequestRef.current + 1
      diffRequestRef.current = request
      setSelectedFile(file)
      setDiffStaged(staged)
      setDiff("")
      setDiffLoaded(false)
      setDiffError(null)
      setDiffLoading(true)
      const result = await _Either.try.async(() => gitApi.diff(repo, file, staged))
      if (request !== diffRequestRef.current) return
      if (result.isRight()) {
        setDiff((result.value as string) || t(lang, "noDiff"))
        setDiffLoaded(true)
      } else {
        setDiffError(String(result.value))
      }
      setDiffLoading(false)
    },
    [repo, lang, selectedFile, diffStaged],
  )

  const reloadDiff = useCallback(() => {
    if (selectedFile) void loadDiff(selectedFile, diffStaged)
  }, [selectedFile, diffStaged, loadDiff])

  const clearDiffIfSelected = useCallback(
    (file: string) => {
      if (file !== selectedFile) return
      setSelectedFile("")
      setDiff("")
      setDiffLoaded(false)
      setDiffLoading(false)
      setDiffError(null)
    },
    [selectedFile],
  )

  return {
    selectedFile,
    diff,
    diffStaged,
    diffLoaded,
    diffLoading,
    diffError,
    selectDiff,
    loadDiff,
    reloadDiff,
    clearDiffIfSelected,
  }
}
