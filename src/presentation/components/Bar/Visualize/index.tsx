import { ChevronDown, ChevronUp, Maximize, ZoomIn, ZoomOut } from "lucide-react"
import { useTranslation } from "../../../context"

import styles from "./styles.module.scss"

type VisualizeBarProps = {
  searchQuery: string
  nodeCount: number
  laneCount: number
  matchCount: number
  matchIndex: number
  zoomPercent: string
  onSearchQueryChange: (nextQuery: string) => void
  onPrevMatch: () => void
  onNextMatch: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
}

export const VisualizeBar = ({
  searchQuery,
  onSearchQueryChange,
  nodeCount,
  laneCount,
  matchCount,
  matchIndex,
  zoomPercent,
  onPrevMatch,
  onNextMatch,
  onZoomIn,
  onZoomOut,
  onResetView,
}: VisualizeBarProps) => {
  const { t } = useTranslation()
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        value={searchQuery}
        placeholder={t("searchCommits")}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          if (event.shiftKey) {
            onPrevMatch()
          } else {
            onNextMatch()
          }
        }}
      />
      {matchCount > 0 && (
        <div className={styles.matchNav}>
          <button
            type="button"
            className="icon-btn"
            onClick={onPrevMatch}
            title={t("prevMatch")}
            aria-label={t("prevMatch")}
          >
            <ChevronUp size={12} />
          </button>
          <span className={styles.count}>
            {matchIndex + 1}/{matchCount}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onNextMatch}
            title={t("nextMatch")}
            aria-label={t("nextMatch")}
          >
            <ChevronDown size={12} />
          </button>
        </div>
      )}
      <span className={styles.count}>
        {nodeCount} · {laneCount}
      </span>
      <div className={styles.spacer} />
      <span className={styles.count} aria-live="polite">
        {zoomPercent}
      </span>
      <button type="button" className="icon-btn" onClick={onZoomIn} title={t("zoomIn")} aria-label={t("zoomIn")}>
        <ZoomIn size={14} />
      </button>
      <button type="button" className="icon-btn" onClick={onZoomOut} title={t("zoomOut")} aria-label={t("zoomOut")}>
        <ZoomOut size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={onResetView}
        title={t("resetView")}
        aria-label={t("resetView")}
      >
        <Maximize size={14} />
      </button>
    </div>
  )
}
