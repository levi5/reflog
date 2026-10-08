import { useCallback, useMemo, useState } from "react"
import { diffParserUseCase } from "../../../../data"
import type { ParsedDiff } from "../../../../domain/entities/diff/diff"
import { MAX_DIFF_BYTES, MAX_DIFF_LINES } from "../../../../shared/constants/limits"
import { useTranslation } from "../../../context"
import { EmptyState } from "../../Empty/State"
import { DiffHunkList } from "./DiffHunkList"
import { countLines, LARGE_DIFF_PAGE_LINES, selectedLinesOf, takeLines } from "./lines"
import styles from "./style.module.scss"

interface DiffPanelProps {
  filePath: string
  isStaged: boolean
  diffContent: string
  loaded: boolean
  loading: boolean
  errorMessage: string | null
  maxHeight?: number
  onLoad: () => void
  onStageHunk: (hunkPatch: string) => void
  onUnstageHunk: (hunkPatch: string) => void
  onDiscardHunk: (hunkPatch: string) => void
  onStageSelected: (partialPatch: string) => void
  onUnstageSelected: (partialPatch: string) => void
}

const EMPTY_DIFF: ParsedDiff = { preamble: [], hunks: [] }

function exceedsDiffLimits(diffContent: string): boolean {
  return diffContent.length > MAX_DIFF_BYTES || countLines(diffContent) > MAX_DIFF_LINES
}

export function DiffPanel({
  filePath,
  isStaged,
  diffContent,
  loaded,
  loading,
  errorMessage,
  maxHeight,
  onLoad,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  onStageSelected,
  onUnstageSelected,
}: DiffPanelProps) {
  const { t } = useTranslation()
  const isLargeDiff = useMemo(() => exceedsDiffLimits(diffContent), [diffContent])
  const parsedDiff = useMemo(
    () => (loaded && !isLargeDiff ? diffParserUseCase.parse(diffContent) : EMPTY_DIFF),
    [diffContent, isLargeDiff, loaded],
  )
  const [selection, setSelection] = useState(() => ({
    scope: `${filePath}:${diffContent}`,
    selectedKeys: new Set<string>(),
  }))

  if (selection.scope !== `${filePath}:${diffContent}`) {
    setSelection({ scope: `${filePath}:${diffContent}`, selectedKeys: new Set() })
  }

  const selectedKeys = selection.selectedKeys

  const toggleLine = useCallback((hunkIndex: number, lineIndex: number) => {
    const key = `${hunkIndex}:${lineIndex}`
    setSelection((previous) => {
      const nextKeys = new Set(previous.selectedKeys)
      if (nextKeys.has(key)) nextKeys.delete(key)
      else nextKeys.add(key)
      return { ...previous, selectedKeys: nextKeys }
    })
  }, [])

  const hunkPatchOf = useCallback(
    (hunkIndex: number): string | null => {
      const hunk = parsedDiff.hunks[hunkIndex]
      return hunk ? diffParserUseCase.buildHunkPatch(parsedDiff.preamble, hunk) : null
    },
    [parsedDiff],
  )

  const applyHunk = useCallback(
    (hunkIndex: number) => {
      const patch = hunkPatchOf(hunkIndex)
      if (!patch) return
      if (isStaged) onUnstageHunk(patch)
      else onStageHunk(patch)
    },
    [hunkPatchOf, isStaged, onStageHunk, onUnstageHunk],
  )

  const discardHunk = useCallback(
    (hunkIndex: number) => {
      const patch = hunkPatchOf(hunkIndex)
      if (patch) onDiscardHunk(patch)
    },
    [hunkPatchOf, onDiscardHunk],
  )

  const applySelectedLines = useCallback(
    (hunkIndex: number) => {
      const hunk = parsedDiff.hunks[hunkIndex]
      if (!hunk) return
      const patch = diffParserUseCase.buildPartialPatch(
        parsedDiff.preamble,
        hunk,
        selectedLinesOf(selectedKeys, hunkIndex),
      )
      if (!patch) return
      if (isStaged) onUnstageSelected(patch)
      else onStageSelected(patch)
    },
    [parsedDiff, selectedKeys, isStaged, onStageSelected, onUnstageSelected],
  )

  if (!filePath) return <EmptyState message={t("selectFileHint")} />

  if (!loaded) {
    return (
      <div className={styles.largeDiffBanner}>
        {errorMessage && (
          <span className={styles.loadError} role="alert">
            {errorMessage}
          </span>
        )}
        <button type="button" className="primary" onClick={onLoad} disabled={loading}>
          {loading ? t("loading") : t("loadDiff")}
        </button>
        {loading && <div className={styles.diffSkeleton} role="status" aria-busy aria-label={t("loading")} />}
      </div>
    )
  }

  if (isLargeDiff) {
    return <LargeDiffView key={`${filePath}:${diffContent.length}`} diffContent={diffContent} maxHeight={maxHeight} />
  }

  if (parsedDiff.hunks.length === 0) {
    return (
      <pre className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
        {diffContent}
      </pre>
    )
  }

  return (
    <DiffHunkList
      parsedDiff={parsedDiff}
      isStaged={isStaged}
      maxHeight={maxHeight}
      selectedKeys={selectedKeys}
      onToggleLine={toggleLine}
      onToggleHunk={applyHunk}
      onStageSelected={applySelectedLines}
      onDiscardHunk={discardHunk}
    />
  )
}

interface LargeDiffViewProps {
  diffContent: string
  maxHeight?: number
}

function LargeDiffView({ diffContent, maxHeight }: LargeDiffViewProps) {
  const { t } = useTranslation()
  const [visibleLineCount, setVisibleLineCount] = useState(LARGE_DIFF_PAGE_LINES)
  const diffLineCount = useMemo(() => countLines(diffContent), [diffContent])

  return (
    <>
      <div className={styles.largeDiffBanner}>
        <span>{t("largeDiffPreview")}</span>
      </div>
      <pre className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
        {takeLines(diffContent, visibleLineCount)}
      </pre>
      {visibleLineCount < diffLineCount && (
        <div className={styles.loadMoreWrap}>
          <button type="button" onClick={() => setVisibleLineCount((count) => count + LARGE_DIFF_PAGE_LINES)}>
            {t("loadMore")}
          </button>
          <button type="button" onClick={() => setVisibleLineCount(diffLineCount)}>
            {t("showAll")}
          </button>
        </div>
      )}
    </>
  )
}
