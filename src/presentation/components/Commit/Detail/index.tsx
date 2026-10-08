import classnames from "classnames"
import type { CSSProperties } from "react"
import type { CommitFileChange, CommitInfo } from "../../../../types"
import { useTranslation } from "../../../context"
import { useResizable } from "../../../hooks"
import {
  COMMIT_DETAIL_MAX_WIDTH,
  COMMIT_DETAIL_MIN_WIDTH,
  COMMIT_DETAIL_WIDTH,
  HASH_SHORT_LENGTH,
} from "../../../../shared/constants/limits"
import { Icon } from "../../Icons"
import { ResizeGrip } from "../../Resizable/Grip"
import { DetailActions } from "./DetailActions"
import { DetailDiff } from "./DetailDiff"
import { DetailFiles } from "./DetailFiles"
import { DetailHeader } from "./DetailHeader"
import { DEFAULT_STORAGE_KEY, EMPTY_PARENT_LABEL } from "./constants"
import type { ResetMode } from "./resetMode"
import { useCommitDiff } from "./useCommitDiff"
import { useCopyFeedback } from "./useCopyFeedback"
import styles from "./style.module.scss"

export type CommitDetailProps = {
  commit: CommitInfo | null
  copied?: boolean
  onCopy?: (hash: string) => void
  onClose?: () => void
  onCherryPick?: (hash: string) => void
  onRevert?: (hash: string) => void
  onReset?: (hash: string, mode: ResetMode) => void
  onCheckout?: (hash: string) => void
  loadFiles?: (hash: string) => Promise<CommitFileChange[]>
  loadDiff?: (hash: string, file?: string) => Promise<string>
  className?: string
  resizable?: boolean
  storageKey?: string
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  expanded?: boolean
}

function shortHashes(hashes: string[]): string {
  return hashes.map((hash) => hash.slice(0, HASH_SHORT_LENGTH)).join(", ")
}

export function CommitDetail({
  commit,
  copied,
  onCopy,
  onClose,
  onCherryPick,
  onRevert,
  onReset,
  onCheckout,
  loadFiles,
  loadDiff,
  className,
  resizable = true,
  storageKey = DEFAULT_STORAGE_KEY,
  initialWidth = COMMIT_DETAIL_WIDTH,
  minWidth = COMMIT_DETAIL_MIN_WIDTH,
  maxWidth = COMMIT_DETAIL_MAX_WIDTH,
  expanded = false,
}: CommitDetailProps) {
  const { t } = useTranslation()
  const detailWidth = useResizable({
    axis: "x",
    initial: initialWidth,
    min: minWidth,
    max: maxWidth,
    storageKey,
    invert: true,
    label: t("resizePanel"),
  })
  const { isCopied, handleCopy } = useCopyFeedback(commit, copied, onCopy)
  const { files, loadingFiles, selectedFile, diffText, diffError, loadingDiff, selectFile } = useCommitDiff({
    hash: commit?.hash ?? null,
    loadFiles,
    loadDiff,
  })

  if (!commit) return null

  const rootStyle = resizable ? ({ "--side-w": `${detailWidth.size}px` } as CSSProperties) : undefined

  return (
    <aside
      className={classnames(
        styles.detail,
        !resizable && styles.detailFixed,
        expanded && styles.detailExpanded,
        className,
      )}
      style={rootStyle}
    >
      {resizable && <ResizeGrip axis="x" edge="start" grip={detailWidth.grip} />}
      <DetailHeader shortHash={commit.short} isCopied={isCopied} onCopy={() => void handleCopy()} onClose={onClose} />
      <Icon.Node.MiniGraph
        commit={commit}
        parentShort={commit.parents[0]?.slice(0, HASH_SHORT_LENGTH) ?? EMPTY_PARENT_LABEL}
        className={styles.miniGraph}
        classes={{
          halo: styles.halo,
          dot: styles.dot,
          label: styles.nodeGraphLabel,
          subLabel: styles.nodeGraphSublabel,
        }}
      />
      <code className={styles.hash}>{commit.hash}</code>
      <p className={styles.meta}>
        {commit.author} · {commit.date}
      </p>
      <p className={styles.message}>{commit.message}</p>
      {commit.refs.length > 0 && <p className={styles.refs}>{commit.refs.join(", ")}</p>}
      {commit.parents.length > 0 && <p className={styles.meta}>← {shortHashes(commit.parents)}</p>}

      <DetailActions
        commit={commit}
        onCherryPick={onCherryPick}
        onRevert={onRevert}
        onReset={onReset}
        onCheckout={onCheckout}
      />
      <DetailFiles files={files} selectedFile={selectedFile} loading={loadingFiles} onSelect={selectFile} />
      <DetailDiff selectedFile={selectedFile} diffText={diffText} error={diffError} loading={loadingDiff} />
    </aside>
  )
}
