import { useMemo } from "react"
import { Loader2, Sparkles } from "lucide-react"
import classnames from "classnames"
import type { GraphViewerProps } from "../../../../types/components/graph"
import { useTranslation } from "../../../context"
import { Commit } from "../../Commit"
import { GitLensList } from "../GitLens"
import styles from "./style.module.scss"

const COMMIT_DETAIL_STORAGE_KEY = "viz.detail"
const NO_COMMIT_SELECTED = ""

export function GraphViewer({
  graph,
  viewport,
  freshHashes,
  matchedHashes,
  activeMatchHash,
  spotlightHashes,
  headTravel,
  isRunning,
  errorKey,
  selectedHash,
  onSelectCommit,
  onCherryPick,
  onRevert,
  onReset,
  onCheckout,
  loadFiles,
  loadDiff,
  isLoading,
  hasMore,
  onLoadMore,
}: GraphViewerProps) {
  const { t } = useTranslation()
  const commits = useMemo(
    () => [...graph.layout.nodes].sort((a, b) => a.row - b.row).map((node) => node.commit),
    [graph.layout.nodes],
  )

  return (
    <div
      data-error-key={errorKey}
      className={classnames(styles.canvasBody, errorKey !== 0 && styles.canvasError)}
      ref={viewport.containerRef}
    >
      {isRunning && <div className={styles.scanline} aria-hidden="true" />}
      {freshHashes.length > 0 && (
        <div className={styles.actionBanner}>
          <Sparkles size={13} className={styles.actionBannerIcon} />
          <span>
            {freshHashes.length} {t("evCommits")} {t("legendNew").toLowerCase()}
          </span>
        </div>
      )}
      {isLoading && (
        <div className={styles.appendingWrap} role="status" aria-busy>
          <span className={styles.appendingPill}>
            <Loader2 size={13} className={styles.loadingSpinner} />
            {t("loading")}
          </span>
        </div>
      )}
      <GitLensList
        commits={commits}
        selectedHash={selectedHash}
        dimmedHashes={graph.dimmedHashes}
        matchedHashes={matchedHashes}
        activeMatchHash={activeMatchHash}
        freshHashes={freshHashes}
        spotlightHashes={spotlightHashes}
        headHash={graph.headHash}
        headTravel={headTravel}
        zoom={viewport.scale}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        onSelectCommit={onSelectCommit}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
      />
      <Commit.Detail
        className={styles.commitDetails}
        commit={graph.selectedCommit}
        onClose={() => onSelectCommit(NO_COMMIT_SELECTED)}
        storageKey={COMMIT_DETAIL_STORAGE_KEY}
        onCherryPick={onCherryPick}
        onRevert={onRevert}
        onReset={onReset}
        onCheckout={onCheckout}
        loadFiles={loadFiles}
        loadDiff={loadDiff}
      />
    </div>
  )
}
