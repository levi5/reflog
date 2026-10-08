import classnames from "classnames"
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from "react"
import { diffParserUseCase } from "../../../../data"
import { useTranslation } from "../../../context"
import { isSelectableLine, stableKey } from "./lines"
import styles from "./style.module.scss"

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

export function DiffHunk({
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
