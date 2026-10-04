import { useEffect, useMemo, useRef, useState } from "react"

import { Bar } from "../../components/Bar"
import { Command } from "../../components/Command"
import { Console } from "../../components/Console"
import { EmptyGraphState } from "../../components/Empty/Graph"
import { Graph } from "../../components/Graph"
import { Skeleton } from "../../components/Skeleton"

import { t } from "../../../i18n"
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
  const lastGraphRef = useRef(repo.graph)
  if (repo.graph.length > 0) lastGraphRef.current = repo.graph
  const visibleGraph = repo.graph.length > 0 ? repo.graph : lastGraphRef.current

  const graph = useVisualizeGraph({
    graph: visibleGraph,
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

  const { graphLoading, loadMoreGraph } = repo

  useEffect(() => {
    if (repo.graph.length === 0 && !graphLoading) void loadMoreGraph()
  }, [repo.graph.length, graphLoading, loadMoreGraph])

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
      visibleGraph.find((commit) =>
        commit.refs.some((ref) => {
          const clean = ref.replace(/^HEAD -> /, "").trim()
          return clean === name || clean.endsWith(`/${name}`)
        }),
      )?.hash ?? ""
    const fromHash = hashForRef(checkout.from)
    const toHash = hashForRef(checkout.to)
    if (!fromHash || !toHash || fromHash === toHash) return null
    return { fromHash, toHash, key: `${fromHash}-${toHash}` }
  }, [consoleSession.changes, visibleGraph])

  const lastLine = consoleSession.lines[consoleSession.lines.length - 1]
  const errorKey = lastLine?.err ? lastLine.at : 0

  if (visibleGraph.length === 0) {
    if (graphLoading) {
      return (
        <div className={styles.simpleLayout}>
          <div className="canvasWrap">
            <Skeleton.Commits count={12} label={t(lang, "loading")} />
          </div>
        </div>
      )
    }
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
        zoomPercent={`${Math.round(viewport.scale * 100)}%`}
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
