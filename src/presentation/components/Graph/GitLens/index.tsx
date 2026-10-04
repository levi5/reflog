import { commitGraphUseCase } from "../../../../data"
import classnames from "classnames"
import { type CSSProperties, useCallback, useEffect, useMemo, useRef } from "react"
import type { CommitInfo } from "../../../../types"
import type { HeadTravel } from "../../../../types/components/graph"
import { GITLENS_LANE_W, GITLENS_ROW_H } from "../../Icons/Graph/Cell"
import { useVirtualRows } from "../../../hooks"
import { Icon } from "../../Icons"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

export interface GitLensListProps {
  commits: CommitInfo[]
  selectedHash: string
  dimmedHashes?: ReadonlySet<string>
  matchedHashes?: ReadonlySet<string>
  activeMatchHash?: string
  freshHashes?: string[]
  spotlightHashes?: ReadonlySet<string>
  headHash?: string
  headTravel?: HeadTravel | null
  zoom?: number
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onSelectCommit: (hash: string) => void
  onZoomIn?: () => void
  onZoomOut?: () => void
}

const MIN_ROW_H = 22
const MAX_ROW_H = 48
const MIN_LANE_W = 10
const MAX_LANE_W = 24
const ENTRANCE_STAGGER_CAP = 20
const ENTRANCE_STEP_MS = 15
const ENTRANCE_MAX_DELAY_MS = 300

function firstLine(message: string): string {
  const line = message.split("\n", 1)[0] ?? message
  return line.trim()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function GitLensList({
  commits,
  selectedHash,
  dimmedHashes,
  matchedHashes,
  activeMatchHash = "",
  freshHashes = [],
  spotlightHashes,
  headHash = "",
  headTravel = null,
  zoom = 1,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onSelectCommit,
  onZoomIn,
  onZoomOut,
}: GitLensListProps) {
  const { t } = useTranslation()
  const layout = useMemo(() => commitGraphUseCase.layoutGraph(commits), [commits])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const freshSet = useMemo(() => new Set(freshHashes), [freshHashes])

  const rowH = Math.round(clamp(GITLENS_ROW_H * zoom, MIN_ROW_H, MAX_ROW_H))
  const laneW = clamp(GITLENS_LANE_W * zoom, MIN_LANE_W, MAX_LANE_W)
  const fontSize = Math.round(clamp(13 * zoom, 12, 16))
  const listStyle = {
    "--gitlens-row-h": `${rowH}px`,
    "--gitlens-font": `${fontSize}px`,
  } as CSSProperties

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasMore || !onLoadMore) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 600 && !isLoading) onLoadMore()
      })
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [hasMore, isLoading, onLoadMore])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheelNative = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      if (event.deltaY < 0) onZoomIn?.()
      else onZoomOut?.()
    }
    el.addEventListener("wheel", onWheelNative, { passive: false })
    return () => el.removeEventListener("wheel", onWheelNative)
  }, [onZoomIn, onZoomOut])

  const virtualRows = useVirtualRows({
    count: layout.rows.length,
    estimate: rowH,
    overscan: 12,
    enabled: layout.rows.length > 150,
  })

  const scrollToHash = useCallback(
    (hash: string) => {
      const index = layout.rows.findIndex((row) => row.commit.hash === hash)
      if (index < 0) return
      const el = scrollRef.current
      if (!el) return
      el.scrollTop = Math.max(0, index * rowH - el.clientHeight / 2)
    },
    [layout.rows, rowH],
  )

  useEffect(() => {
    if (activeMatchHash) scrollToHash(activeMatchHash)
  }, [activeMatchHash, scrollToHash])

  useEffect(() => {
    if (headTravel) scrollToHash(headTravel.toHash)
  }, [headTravel, scrollToHash])

  return (
    <div ref={scrollRef} className={styles.list} style={listStyle} onScroll={virtualRows.onScroll}>
      <div style={{ height: virtualRows.totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${virtualRows.offsetTop}px)` }}>
          {virtualRows.items.map(({ index }) => {
            const { commit, lane, ...graphRow } = layout.rows[index]
            const hash = commit.hash
            const isSelected = selectedHash === hash
            const isHead = headHash !== "" && headHash === hash
            const refs = commitGraphUseCase.parseRefs(commit.refs)
            const entranceDelay =
              index <= ENTRANCE_STAGGER_CAP ? Math.min(index * ENTRANCE_STEP_MS, ENTRANCE_MAX_DELAY_MS) : 0
            return (
              <button
                key={hash}
                id={`gitlens-row-${hash}`}
                type="button"
                aria-label={`${commit.short} ${commit.message} ${commit.author}`}
                title={`${commit.message}\n${commit.author} · ${commit.date} · ${commit.short}`}
                aria-current={isSelected}
                style={entranceDelay > 0 ? { animationDelay: `${entranceDelay}ms` } : undefined}
                className={classnames(
                  styles.row,
                  isSelected && styles.selected,
                  dimmedHashes?.has(hash) && styles.dimmed,
                  matchedHashes?.has(hash) && styles.matched,
                  activeMatchHash === hash && styles.activeMatch,
                  freshSet.has(hash) && styles.fresh,
                  spotlightHashes?.has(hash) && styles.spotlight,
                  isHead && styles.head,
                  headTravel?.fromHash === hash && styles.travelFrom,
                  headTravel?.toHash === hash && styles.travelTo,
                )}
                onClick={() => onSelectCommit(isSelected ? "" : hash)}
              >
                <Icon.Graph.Cell
                  row={{ commit, lane, ...graphRow }}
                  lanes={Math.max(layout.lanes, 1)}
                  rowHeight={rowH}
                  laneWidth={laneW}
                  className={styles.graph}
                />
                <span className={styles.label}>
                  {refs.length > 0 && (
                    <span className={styles.refs}>
                      {refs.slice(0, 2).map((ref) => (
                        <span
                          key={`${ref.kind}-${ref.label}`}
                          className={classnames(
                            styles.ref,
                            ref.kind === "head" && styles.refHead,
                            ref.kind === "tag" && styles.refTag,
                          )}
                        >
                          {ref.label}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className={styles.message}>{firstLine(commit.message)}</span>
                  <span className={styles.author}>{commit.author}</span>
                </span>
              </button>
            )
          })}
        </div>
        {hasMore && !isLoading && onLoadMore && (
          <div className={styles.footer}>
            <button type="button" className={styles.loadMore} onClick={onLoadMore}>
              {t("loadingMore")}
            </button>
          </div>
        )}
        {isLoading && <div className={styles.loading}>{t("loadingEllipsis")}</div>}
      </div>
    </div>
  )
}
