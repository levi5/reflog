import { diffParserUseCase } from "../../../../data"
import classnames from "classnames"
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from "react"
import type { ParsedDiff } from "../../../../domain/entities/diff/diff"
import { MAX_DIFF_LINES, MAX_DIFF_BYTES } from "../../../../shared/constants/limits"
import { EmptyState } from "../../Empty/State"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

const LINE_KEY_LENGTH = 32
const LARGE_DIFF_PAGE_LINES = 1000

function stableKey(content: string, prefix: string, index: number): string {
  return `${prefix}-${content.slice(0, LINE_KEY_LENGTH)}-${index}`
}

function countLines(content: string): number {
  if (!content) return 0
  let count = 1
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") count += 1
  }
  return count
}

function takeLines(content: string, count: number): string {
  let end = 0
  let lines = 0
  while (end < content.length && lines < count) {
    if (content[end] === "\n") lines += 1
    end += 1
  }
  return content.slice(0, end)
}

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

function DiffPreamble({ parsedDiff }: { parsedDiff: ParsedDiff }) {
  if (parsedDiff.preamble.length === 0) return null

  return (
    <pre className={styles.preamble}>
      {parsedDiff.preamble.map((preambleLine, lineIndex) => (
        <span
          key={stableKey(preambleLine, "preamble", lineIndex)}
          className={styles[diffParserUseCase.getLineKind(preambleLine)]}
        >
          {preambleLine}
          {"\n"}
        </span>
      ))}
    </pre>
  )
}

interface DiffHunkProps {
  hunkHeader: string
  hunkLines: string[]
  isStaged?: boolean
  selectedLines: Set<number>
  onToggleLine: (lineIndex: number) => void
  onToggleHunk: () => void
  onStageSelected: () => void
  onDiscardHunk: () => void
}

function isSelectableLine(diffLine: string): boolean {
  return diffLine.startsWith("+") || diffLine.startsWith("-")
}

function DiffHunk({
  hunkHeader,
  hunkLines,
  isStaged,
  selectedLines,
  onToggleLine,
  onToggleHunk,
  onStageSelected,
  onDiscardHunk,
}: DiffHunkProps) {
  const { t, format } = useTranslation()
  const [activeLine, setActiveLine] = useState(0)
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const selectableIndexes = useMemo(
    () => hunkLines.map((line, index) => (isSelectableLine(line) ? index : -1)).filter((index) => index >= 0),
    [hunkLines],
  )

  const focusLine = useCallback((lineIndex: number) => {
    setActiveLine(lineIndex)
    lineRefs.current[lineIndex]?.focus()
  }, [])

  const moveFocus = useCallback(
    (from: number, delta: number) => {
      if (selectableIndexes.length === 0) return
      const position = selectableIndexes.indexOf(from)
      const nextPosition = Math.min(Math.max(position + delta, 0), selectableIndexes.length - 1)
      focusLine(selectableIndexes[nextPosition])
    },
    [selectableIndexes, focusLine],
  )

  const onLineKeyDown = (event: KeyboardEvent<HTMLButtonElement>, lineIndex: number) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault()
      moveFocus(lineIndex, 1)
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault()
      moveFocus(lineIndex, -1)
    } else if (event.key === "Home") {
      event.preventDefault()
      moveFocus(selectableIndexes[0], 0)
    } else if (event.key === "End") {
      event.preventDefault()
      moveFocus(selectableIndexes[selectableIndexes.length - 1], 0)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveLine(lineIndex)
      onToggleLine(lineIndex)
    } else if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      for (const index of selectableIndexes) onToggleLine(index)
    }
  }

  return (
    <div className={styles.hunkBlock}>
      <div className={styles.hunkHead}>
        <code>{hunkHeader}</code>
        <span className={styles.hunkBtns}>
          {selectedLines.size > 0 && (
            <button type="button" className="mini-btn" onClick={onStageSelected}>
              {isStaged ? t("unstageLines") : t("stageLines")} ({selectedLines.size})
            </button>
          )}
          <button type="button" className="mini-btn" onClick={onToggleHunk}>
            {isStaged ? t("hunkUnstage") : t("hunkStage")}
          </button>
          {!isStaged && (
            <button type="button" className="mini-btn" onClick={onDiscardHunk}>
              {t("hunkDiscard")}
            </button>
          )}
        </span>
      </div>
      <pre className={styles.code}>
        {hunkLines.map((diffLine, lineIndex) => {
          if (!isSelectableLine(diffLine)) {
            return (
              <span
                key={stableKey(diffLine, "line", lineIndex)}
                className={styles[diffParserUseCase.getLineKind(diffLine)]}
              >
                {diffLine}
                {"\n"}
              </span>
            )
          }
          const isSelected = selectedLines.has(lineIndex)
          const isActive = activeLine === lineIndex
          return (
            <button
              key={stableKey(diffLine, "line", lineIndex)}
              ref={(element) => {
                lineRefs.current[lineIndex] = element
              }}
              type="button"
              aria-pressed={isSelected}
              aria-label={
                isSelected
                  ? format("diffLineSelected", { line: lineIndex + 1 })
                  : format("diffSelectableLine", { line: lineIndex + 1 })
              }
              tabIndex={isActive ? 0 : -1}
              title={t("selectLinesHint")}
              className={classnames(
                styles.lineBtn,
                styles[diffParserUseCase.getLineKind(diffLine)],
                isSelected && styles.selected,
              )}
              onFocus={() => setActiveLine(lineIndex)}
              onKeyDown={(event) => onLineKeyDown(event, lineIndex)}
              onClick={() => {
                setActiveLine(lineIndex)
                onToggleLine(lineIndex)
              }}
            >
              {diffLine}
              {"\n"}
            </button>
          )
        })}
      </pre>
    </div>
  )
}

interface DiffHunkListProps {
  parsedDiff: ParsedDiff
  isStaged?: boolean
  maxHeight?: number
  selectedKeys: Set<string>
  onToggleLine: (hunkIndex: number, lineIndex: number) => void
  onToggleHunk: (hunkIndex: number) => void
  onStageSelected: (hunkIndex: number) => void
  onDiscardHunk: (hunkIndex: number) => void
}

function DiffHunkList({
  parsedDiff,
  isStaged,
  maxHeight,
  selectedKeys,
  onToggleLine,
  onToggleHunk,
  onStageSelected,
  onDiscardHunk,
}: DiffHunkListProps) {
  return (
    <div className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
      <DiffPreamble parsedDiff={parsedDiff} />
      {parsedDiff.hunks.map((hunk, hunkIndex) => {
        const selectedLines = new Set<number>()
        selectedKeys.forEach((key) => {
          const separator = key.indexOf(":")
          if (Number(key.slice(0, separator)) === hunkIndex) {
            selectedLines.add(Number(key.slice(separator + 1)))
          }
        })
        return (
          <div key={stableKey(hunk.header, "hunk", hunkIndex)} className={styles.hunkBlock}>
            <DiffHunk
              hunkHeader={hunk.header}
              hunkLines={hunk.lines}
              isStaged={isStaged}
              selectedLines={selectedLines}
              onToggleLine={(lineIndex) => onToggleLine(hunkIndex, lineIndex)}
              onToggleHunk={() => onToggleHunk(hunkIndex)}
              onStageSelected={() => onStageSelected(hunkIndex)}
              onDiscardHunk={() => onDiscardHunk(hunkIndex)}
            />
          </div>
        )
      })}
    </div>
  )
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
  const diffSize = diffContent.length
  const diffLineCount = useMemo(() => countLines(diffContent), [diffContent])
  const isLargeDiff = diffSize > MAX_DIFF_BYTES || diffLineCount > MAX_DIFF_LINES
  const parsedDiff = useMemo(
    () => (loaded && !isLargeDiff ? diffParserUseCase.parse(diffContent) : { preamble: [], hunks: [] }),
    [diffContent, isLargeDiff, loaded],
  )
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [visibleLineCount, setVisibleLineCount] = useState(LARGE_DIFF_PAGE_LINES)
  const [selectionScope, setSelectionScope] = useState(() => [diffContent, filePath])

  if (selectionScope[0] !== diffContent || selectionScope[1] !== filePath) {
    setSelectionScope([diffContent, filePath])
    setSelectedKeys(new Set())
    setVisibleLineCount(LARGE_DIFF_PAGE_LINES)
  }

  if (!filePath) {
    return <EmptyState message={t("selectFileHint")} />
  }

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

  const visibleDiff = isLargeDiff ? takeLines(diffContent, visibleLineCount) : diffContent

  const handleToggleHunk = (hunkIndex: number) => {
    const hunk = parsedDiff.hunks[hunkIndex]
    if (!hunk) return
    const hunkPatch = diffParserUseCase.buildHunkPatch(parsedDiff.preamble, hunk)
    if (isStaged) {
      onUnstageHunk(hunkPatch)
    } else {
      onStageHunk(hunkPatch)
    }
  }

  const handleDiscardHunk = (hunkIndex: number) => {
    const hunk = parsedDiff.hunks[hunkIndex]
    if (!hunk) return
    onDiscardHunk(diffParserUseCase.buildHunkPatch(parsedDiff.preamble, hunk))
  }

  const handleToggleLine = (hunkIndex: number, lineIndex: number) => {
    const key = `${hunkIndex}:${lineIndex}`
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleStageSelected = (hunkIndex: number) => {
    const hunk = parsedDiff.hunks[hunkIndex]
    if (!hunk) return
    const indexes = new Set<number>()
    selectedKeys.forEach((key) => {
      const separator = key.indexOf(":")
      if (Number(key.slice(0, separator)) === hunkIndex) {
        indexes.add(Number(key.slice(separator + 1)))
      }
    })
    const patch = diffParserUseCase.buildPartialPatch(parsedDiff.preamble, hunk, indexes)
    if (!patch) return
    if (isStaged) {
      onUnstageSelected(patch)
    } else {
      onStageSelected(patch)
    }
  }

  return (
    <>
      {isLargeDiff && (
        <div className={styles.largeDiffBanner}>
          <span>{t("largeDiffPreview")}</span>
        </div>
      )}
      {isLargeDiff ? (
        <>
          <pre className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
            {visibleDiff}
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
      ) : parsedDiff.hunks.length === 0 ? (
        <pre className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
          {diffContent}
        </pre>
      ) : (
        <DiffHunkList
          parsedDiff={parsedDiff}
          isStaged={isStaged}
          maxHeight={maxHeight}
          selectedKeys={selectedKeys}
          onToggleLine={handleToggleLine}
          onToggleHunk={handleToggleHunk}
          onStageSelected={handleStageSelected}
          onDiscardHunk={handleDiscardHunk}
        />
      )}
    </>
  )
}
