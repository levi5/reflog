import { blameParserUseCase } from "../../../data"
import { _Either } from "funcio"
import { useCallback, useRef, useState } from "react"
import type { BlameLine } from "../../../domain/entities/blame/blame"
import { gitApi } from "../../../infrastructure/git"
import { lruSet } from "../ui/lru"
import { BLAME_CACHE_ENTRIES } from "./constants"

interface BlameDeps {
  repo: string
}

export function useStagingBlame({ repo }: BlameDeps) {
  const [blameFile, setBlameFile] = useState("")
  const [blameLines, setBlameLines] = useState<BlameLine[]>([])
  const [blameLoading, setBlameLoading] = useState(false)
  const [blameError, setBlameError] = useState<string | null>(null)
  const [blameStale, setBlameStale] = useState(false)
  const blameRequestRef = useRef(0)
  const blameCacheRef = useRef(new Map<string, BlameLine[]>())
  const hasContentRef = useRef(false)

  const showLines = useCallback((lines: BlameLine[]) => {
    hasContentRef.current = lines.length > 0
    setBlameLines(lines)
    setBlameStale(false)
  }, [])

  const loadBlame = useCallback(
    async (file: string) => {
      if (!repo || !file) return
      const request = blameRequestRef.current + 1
      blameRequestRef.current = request
      setBlameFile(file)
      setBlameError(null)
      setBlameStale(hasContentRef.current)

      const cacheKey = `${repo}:${file}`
      const cached = blameCacheRef.current.get(cacheKey)
      if (cached) {
        showLines(cached)
        setBlameLoading(false)
        return
      }

      setBlameLoading(true)
      const result = await _Either.try.async(() => gitApi.blame(repo, file))
      if (request !== blameRequestRef.current) return
      setBlameLoading(false)
      if (result.isRight()) {
        const lines = blameParserUseCase.parse(result.value as string)
        lruSet(blameCacheRef.current, cacheKey, lines, BLAME_CACHE_ENTRIES)
        showLines(lines)
      } else {
        showLines([])
        setBlameError(String(result.value))
      }
    },
    [repo, showLines],
  )

  const resetBlame = useCallback(() => {
    blameRequestRef.current += 1
    blameCacheRef.current.clear()
    hasContentRef.current = false
    setBlameFile("")
    setBlameLines([])
    setBlameLoading(false)
    setBlameError(null)
    setBlameStale(false)
  }, [])

  return { blameFile, blameLines, blameLoading, blameError, blameStale, loadBlame, resetBlame }
}
