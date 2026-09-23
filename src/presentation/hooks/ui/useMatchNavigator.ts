import { useCallback, useEffect, useMemo, useState } from "react"
import type { CanvasGraphLayout } from "../../../domain/entities/graph/graph-layout"
import type { GraphViewport } from "../../../types/components/graph"
import { nodePoint } from "../../components/Graph/Canvas/canvas-layout"

const NO_MATCHED_SET: ReadonlySet<string> = new Set<string>()

interface UseMatchNavigatorOptions {
  matchedHashes: string[]
  layout: CanvasGraphLayout
  viewport: GraphViewport
}

export function useMatchNavigator({ matchedHashes, layout, viewport }: UseMatchNavigatorOptions) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [trackedHashes, setTrackedHashes] = useState(matchedHashes)
  useEffect(() => {
    if (trackedHashes !== matchedHashes) {
      setTrackedHashes(matchedHashes)
      setActiveIndex(0)
    }
  }, [matchedHashes, trackedHashes])
  const matchCount = matchedHashes.length

  const goNext = useCallback(() => {
    if (matchCount === 0) return
    setActiveIndex((previousIndex) => (previousIndex + 1) % matchCount)
  }, [matchCount])

  const goPrev = useCallback(() => {
    if (matchCount === 0) return
    setActiveIndex((previousIndex) => (previousIndex - 1 + matchCount) % matchCount)
  }, [matchCount])

  const safeIndex = matchCount === 0 ? 0 : activeIndex % matchCount
  const activeHash = matchCount === 0 ? "" : matchedHashes[safeIndex]

  const matchedSet = useMemo(
    () => (matchedHashes.length === 0 ? NO_MATCHED_SET : new Set<string>(matchedHashes)),
    [matchedHashes],
  )

  const centerOn = viewport.centerOn
  useEffect(() => {
    if (!activeHash) return
    const node = layout.nodes.find((candidate) => candidate.commit.hash === activeHash)
    if (!node) return
    centerOn(nodePoint(node))
  }, [activeHash, layout, centerOn])

  return { matchCount, activeIndex: safeIndex, activeHash, matchedSet, goNext, goPrev }
}
