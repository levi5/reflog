import { useEffect, useMemo, useState } from "react"

import { Bar } from "../../components/Bar"
import { Command } from "../../components/Command"
import { Console } from "../../components/Console"
import { EmptyGraphState } from "../../components/Empty/Graph"
import { Graph } from "../../components/Graph"

import { useConsoleSession } from "../../hooks/console/useConsoleSession"
import { useGraphViewport } from "../../hooks"
import { useMatchNavigator } from "../../hooks"
import { useRepo, useSearch, useSettingsContext } from "../../context"
import { useVisualizeGraph } from "../../hooks"
import { VISUALIZE_CATEGORIES, VISUALIZE_COMMAND_BLOCKS } from "../../cms/blocks/visualizeBlocks"

import styles from "./style.module.scss"

export const Visualize = () => {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, setQuery, scope } = useSearch()
  const viewport = useGraphViewport()
  const [selectedHash, setSelectedHash] = useState("")

  const graph = useVisualizeGraph({
    graph: repo.graph,
    query,
    scope,
    selectedHash,
  })
  const matchNav = useMatchNavigator({
    matchedHashes: graph.matchedHashes,
    layout: graph.layout,
    viewport,
  })
  const consoleSession = useConsoleSession({ language: lang, repo })

  const { position, scale, containerRef } = viewport
  const { canvasHeight } = graph.geometry
  const { graphHasMore, graphLoading, loadMoreGraph } = repo
  const isLoadingRef = useState({ loading: false })[0]

  useEffect(() => {
    if (!graphLoading) {
      isLoadingRef.loading = false
    }
  }, [graphLoading, isLoadingRef])

  useEffect(() => {
    if (!graphHasMore || graphLoading || isLoadingRef.loading) return
    const container = containerRef.current
    const viewportHeight = container?.clientHeight ?? window.innerHeight
    const visibleBottomY = (viewportHeight - (position.y + 20)) / scale
    const THRESHOLD = 500
    if (visibleBottomY >= canvasHeight - THRESHOLD) {
      isLoadingRef.loading = true
      loadMoreGraph?.()
    }
  }, [position.y, scale, canvasHeight, graphHasMore, graphLoading, loadMoreGraph, containerRef, isLoadingRef])

  const spotlightHashes = useMemo(() => {
    const hashes = new Set<string>()
    for (const change of consoleSession.changes) {
      if (change.kind !== "spotlight") continue
      for (const hash of change.hashes) hashes.add(hash)
    }
    return hashes
  }, [consoleSession.changes])

  const headTravel = useMemo(() => {
    const checkout = consoleSession.changes.find((change) => change.kind === "checkout")
    if (checkout?.kind !== "checkout") return null
    const hashForRef = (name: string) =>
      repo.graph.find((commit) =>
        commit.refs.some((ref) => {
          const clean = ref.replace(/^HEAD -> /, "").trim()
          return clean === name || clean.endsWith(`/${name}`)
        }),
      )?.hash ?? ""
    const fromHash = hashForRef(checkout.from)
    const toHash = hashForRef(checkout.to)
    if (!fromHash || !toHash || fromHash === toHash) return null
    return { fromHash, toHash, key: `${fromHash}-${toHash}` }
  }, [consoleSession.changes, repo.graph])

  const lastLine = consoleSession.lines[consoleSession.lines.length - 1]
  const errorKey = lastLine?.err ? lastLine.at : 0

  if (repo.graph.length === 0) {
    return <EmptyGraphState className={styles.simpleLayout} />
  }

  return (
    <div className={styles.simpleLayout}>
      <Bar.Visualize
        searchQuery={query}
        onSearchQueryChange={setQuery}
        nodeCount={graph.layout.nodes.length}
        laneCount={graph.layout.lanes}
        matchCount={matchNav.matchCount}
        matchIndex={matchNav.activeIndex}
        onPrevMatch={matchNav.goPrev}
        onNextMatch={matchNav.goNext}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onResetView={viewport.reset}
      />
      <div className={styles.body}>
        <Console.Git
          session={consoleSession}
          blocksView={
            <Command.Blocks
              running={consoleSession.running}
              categories={VISUALIZE_CATEGORIES}
              blocks={VISUALIZE_COMMAND_BLOCKS}
              onRun={consoleSession.onRequestRun}
            />
          }
        />
        <Graph.View
          graph={graph}
          viewport={viewport}
          freshHashes={consoleSession.freshHashes}
          matchedHashes={matchNav.matchedSet}
          activeMatchHash={matchNav.activeHash}
          spotlightHashes={spotlightHashes}
          headTravel={headTravel}
          isRunning={consoleSession.running}
          errorKey={errorKey}
          selectedHash={selectedHash}
          onSelectCommit={setSelectedHash}
          onCherryPick={repo.cherryPick}
          onRevert={repo.revert}
          onReset={repo.resetBranch}
          onCheckout={(hash) => repo.checkoutBranch(hash)}
          loadFiles={repo.loadCommitFiles}
          loadDiff={repo.loadCommitDiff}
          isLoading={repo.graphLoading}
          hasMore={repo.graphHasMore}
          onLoadMore={repo.loadMoreGraph}
        />
      </div>
    </div>
  )
}
