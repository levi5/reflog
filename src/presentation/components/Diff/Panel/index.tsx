import classnames from "classnames"
import { useMemo } from "react"
import type { ParsedDiff } from "../../../../domain/entities/diff/diff"
import { buildHunkPatch, lineKind, parseDiff } from "../../../../main/adapters"
import { useTranslation } from "../../../context"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

const LINE_KEY_LENGTH = 32

function stableKey(content: string, prefix: string, index: number): string {
  return `${prefix}-${content.slice(0, LINE_KEY_LENGTH)}-${index}`
}

interface DiffPanelProps {
  filePath: string
  isStaged: boolean
  diffContent: string
  maxHeight?: number
  onShowUnstaged: () => void
  onShowStaged: () => void
  onStageFile: () => void
  onUnstageFile: () => void
  onDiscardFile: () => void
  onStageHunk: (hunkPatch: string) => void
  onUnstageHunk: (hunkPatch: string) => void
  onDiscardHunk: (hunkPatch: string) => void
  onEditFile: () => void
}

interface DiffToolbarProps {
  isStaged?: boolean
  onShowUnstaged?: () => void
  onShowStaged?: () => void
  onStageFile?: () => void
  onUnstageFile?: () => void
  onDiscardFile?: () => void
  onEditFile?: () => void
}

function DiffToolbar({
  isStaged,
  onShowUnstaged,
  onShowStaged,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  onEditFile,
}: DiffToolbarProps) {
  const { t } = useTranslation()
  return (
    <div className={classnames(styles.rowFlex, styles.wrap)}>
      <button type="button" onClick={onShowUnstaged}>
        Unstaged
      </button>
      <button type="button" onClick={onShowStaged}>
        Staged
      </button>
      <button type="button" onClick={onEditFile} title={t("editFile")}>
        {t("editFile")}
      </button>
      <button type="button" onClick={onStageFile}>
        + stage
      </button>
      <button type="button" onClick={onUnstageFile}>
        − unstage
      </button>
      <button type="button" className="danger" onClick={onDiscardFile}>
        {t("discard")}
      </button>
      <span className={classnames(styles.fbadge, styles.green)}>{isStaged ? t("staged") : t("unstaged")}</span>
    </div>
  )
}

function DiffPreamble({ parsedDiff }: { parsedDiff: ParsedDiff }) {
  if (parsedDiff.preamble.length === 0) return null

  return (
    <pre className={styles.preamble}>
      {parsedDiff.preamble.map((preambleLine, lineIndex) => (
        <span key={stableKey(preambleLine, "preamble", lineIndex)} className={styles[lineKind(preambleLine)]}>
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
  onToggleHunk: () => void
  onDiscardHunk: () => void
}

function DiffHunk({ hunkHeader, hunkLines, isStaged, onToggleHunk, onDiscardHunk }: DiffHunkProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.hunkBlock}>
      <div className={styles.hunkHead}>
        <code>{hunkHeader}</code>
        <span className={styles.hunkBtns}>
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
        {hunkLines.map((diffLine, lineIndex) => (
          <span key={stableKey(diffLine, "line", lineIndex)} className={styles[lineKind(diffLine)]}>
            {diffLine}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  )
}

interface DiffHunkListProps {
  parsedDiff: ParsedDiff
  isStaged?: boolean
  maxHeight?: number
  onToggleHunk: (hunkIndex: number) => void
  onDiscardHunk: (hunkIndex: number) => void
}

function DiffHunkList({ parsedDiff, isStaged, maxHeight, onToggleHunk, onDiscardHunk }: DiffHunkListProps) {
  return (
    <div className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
      <DiffPreamble parsedDiff={parsedDiff} />
      {parsedDiff.hunks.map((hunk, hunkIndex) => (
        <div key={stableKey(hunk.header, "hunk", hunkIndex)} className={styles.hunkBlock}>
          <DiffHunk
            hunkHeader={hunk.header}
            hunkLines={hunk.lines}
            isStaged={isStaged}
            onToggleHunk={() => onToggleHunk(hunkIndex)}
            onDiscardHunk={() => onDiscardHunk(hunkIndex)}
          />
        </div>
      ))}
    </div>
  )
}

export function DiffPanel({
  filePath,
  isStaged,
  diffContent,
  maxHeight,
  onShowUnstaged,
  onShowStaged,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  onEditFile,
}: DiffPanelProps) {
  const { t } = useTranslation()
  const parsedDiff = useMemo(() => parseDiff(diffContent), [diffContent])

  if (!filePath) {
    return <EmptyState message={t("selectFileHint")} />
  }

  const handleToggleHunk = (hunkIndex: number) => {
    const hunk = parsedDiff.hunks[hunkIndex]
    if (!hunk) return
    const hunkPatch = buildHunkPatch(parsedDiff.preamble, hunk)
    if (isStaged) {
      onUnstageHunk(hunkPatch)
    } else {
      onStageHunk(hunkPatch)
    }
  }

  const handleDiscardHunk = (hunkIndex: number) => {
    const hunk = parsedDiff.hunks[hunkIndex]
    if (!hunk) return
    onDiscardHunk(buildHunkPatch(parsedDiff.preamble, hunk))
  }

  const showUnstaged = onShowUnstaged
  const showStaged = onShowStaged
  const stageFile = onStageFile
  const unstageFile = onUnstageFile
  const discardFile = onDiscardFile
  const editFile = onEditFile

  return (
    <>
      <DiffToolbar
        isStaged={isStaged}
        onShowUnstaged={showUnstaged}
        onShowStaged={showStaged}
        onStageFile={stageFile}
        onUnstageFile={unstageFile}
        onDiscardFile={discardFile}
        onEditFile={editFile}
      />
      {parsedDiff.hunks.length === 0 ? (
        <pre className={styles.diff} style={maxHeight ? { maxHeight } : undefined}>
          {diffContent}
        </pre>
      ) : (
        <DiffHunkList
          parsedDiff={parsedDiff}
          isStaged={isStaged}
          maxHeight={maxHeight}
          onToggleHunk={handleToggleHunk}
          onDiscardHunk={handleDiscardHunk}
        />
      )}
    </>
  )
}
