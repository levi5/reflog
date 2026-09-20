import { Loader2, Sparkles } from "lucide-react"
import classnames from "classnames"
import type { GraphViewerProps } from "../../../../types/components/graph"
import { useTranslation } from "../../../context"
import { Commit } from "../../Commit"
import { GraphCanvas } from "../Canvas"
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

  return (
    <div
      key={errorKey}
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
        <div className={styles.loadingBanner}>
          <Loader2 size={13} className={styles.loadingSpinner} />
          <span>{t("loading")}</span>
        </div>
      )}
      <GraphCanvas
        layout={graph.layout}
        geometry={graph.geometry}
        viewport={viewport}
        headHash={graph.headHash}
        freshHashes={freshHashes}
        dimmedHashes={graph.dimmedHashes}
        matchedHashes={matchedHashes}
        activeMatchHash={activeMatchHash}
        spotlightHashes={spotlightHashes}
        headTravel={headTravel}
        isRunning={isRunning}
        selectedHash={selectedHash}
        onSelectCommit={onSelectCommit}
      />
      {hasMore && !isLoading && (
        <div className={styles.loadMoreWrap}>
          <button type="button" className={styles.loadMoreButton} onClick={onLoadMore} title={t("loadMore")}>
            {t("loadMore")}
          </button>
        </div>
      )}
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
