import type { ParsedDiff } from "../../../../domain/entities/diff/diff"
import { diffParserUseCase } from "../../../../data"
import { DiffHunk } from "./DiffHunk"
import { selectedLinesOf, stableKey } from "./lines"
import styles from "./style.module.scss"

export function DiffPreamble({ parsedDiff }: { parsedDiff: ParsedDiff }) {
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

export function DiffHunkList({
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
      {parsedDiff.hunks.map((hunk, hunkIndex) => (
        <DiffHunk
          key={stableKey(hunk.header, "hunk", hunkIndex)}
          hunkHeader={hunk.header}
          hunkLines={hunk.lines}
          isStaged={isStaged}
          selectedLines={selectedLinesOf(selectedKeys, hunkIndex)}
          onToggleLine={(lineIndex) => onToggleLine(hunkIndex, lineIndex)}
          onToggleHunk={() => onToggleHunk(hunkIndex)}
          onStageSelected={() => onStageSelected(hunkIndex)}
          onDiscardHunk={() => onDiscardHunk(hunkIndex)}
        />
      ))}
    </div>
  )
}
