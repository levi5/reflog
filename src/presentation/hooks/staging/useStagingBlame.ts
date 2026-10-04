import { blameParserUseCase } from "../../../data"
import { _Either } from "funcio"
import { useCallback, useRef, useState } from "react"
import type { BlameLine } from "../../../domain/entities/blame/blame"
import { gitApi } from "../../../infrastructure/git"

interface BlameDeps {
  repo: string
}

export function useStagingBlame({ repo }: BlameDeps) {
  const [blameFile, setBlameFile] = useState("")
  const [blameLines, setBlameLines] = useState<BlameLine[]>([])
  const [blameLoading, setBlameLoading] = useState(false)
  const [blameError, setBlameError] = useState<string | null>(null)
  const blameRequestRef = useRef(0)

  const loadBlame = useCallback(
    async (file: string) => {
      if (!repo || !file) return
      const request = blameRequestRef.current + 1
      blameRequestRef.current = request
      setBlameFile(file)
      setBlameLines([])
      setBlameError(null)
      setBlameLoading(true)
      const result = await _Either.try.async(() => gitApi.blame(repo, file))
      if (request !== blameRequestRef.current) return
      if (result.isRight()) {
        setBlameLines(blameParserUseCase.parse(result.value as string))
      } else {
        setBlameError(String(result.value))
      }
      setBlameLoading(false)
    },
    [repo],
  )

  const resetBlame = useCallback(() => {
    blameRequestRef.current += 1
    setBlameFile("")
    setBlameLines([])
    setBlameLoading(false)
    setBlameError(null)
  }, [])

  return { blameFile, blameLines, blameLoading, blameError, loadBlame, resetBlame }
}
