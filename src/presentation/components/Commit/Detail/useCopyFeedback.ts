import { useCallback, useEffect, useRef, useState } from "react"
import type { CommitInfo } from "../../../../types"
import { COPY_FEEDBACK_MS } from "../../../../shared/constants/limits"

async function writeHashToClipboard(hash: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(hash)
    return true
  } catch {
    return false
  }
}

export function useCopyFeedback(
  commit: CommitInfo | null,
  controlledCopied?: boolean,
  controlledOnCopy?: (hash: string) => void,
  timeoutMs: number = COPY_FEEDBACK_MS,
) {
  const [internalCopied, setInternalCopied] = useState(false)
  const feedbackTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current)
      }
    }
  }, [])

  const showInternalFeedback = useCallback(() => {
    setInternalCopied(true)
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current)
    }
    feedbackTimer.current = window.setTimeout(() => {
      setInternalCopied(false)
    }, timeoutMs)
  }, [timeoutMs])

  const handleCopy = useCallback(async () => {
    if (!commit) return
    if (controlledOnCopy) {
      controlledOnCopy(commit.hash)
      return
    }
    const ok = await writeHashToClipboard(commit.hash)
    if (ok) showInternalFeedback()
  }, [commit, controlledOnCopy, showInternalFeedback])

  if (controlledOnCopy) return { isCopied: controlledCopied ?? false, handleCopy }
  return { isCopied: internalCopied, handleCopy }
}
