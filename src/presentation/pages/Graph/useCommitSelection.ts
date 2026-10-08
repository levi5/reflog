import { useCallback, useEffect, useRef, useState } from "react"
import type { CommitInfo } from "../../../types"

interface CommitSelectionOptions {
  hashParam: string | null
  log: CommitInfo[]
  graph: CommitInfo[]
}

export function useCommitSelection({ hashParam, log, graph }: CommitSelectionOptions) {
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const dismissedHashRef = useRef("")
  const selectedHash = selectedCommit?.hash

  const select = useCallback((commit: CommitInfo) => {
    dismissedHashRef.current = ""
    setSelectedCommit(commit)
  }, [])

  const dismiss = useCallback(() => {
    if (selectedCommit) dismissedHashRef.current = selectedCommit.hash
    setSelectedCommit(null)
  }, [selectedCommit])

  useEffect(() => {
    if (!hashParam) {
      dismissedHashRef.current = ""
      return
    }
    if (dismissedHashRef.current === hashParam || selectedHash === hashParam) return
    const found =
      log.find((commit) => commit.hash === hashParam || commit.short === hashParam) ??
      graph.find((commit) => commit.hash === hashParam || commit.short === hashParam)
    if (found) setSelectedCommit(found)
  }, [hashParam, log, graph, selectedHash])

  return { selectedCommit, selectedHash, select, dismiss }
}
