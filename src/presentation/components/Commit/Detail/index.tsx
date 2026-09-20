import classnames from "classnames"
import { Check, Copy, FileText, GitBranch, ListPlus, RotateCcw, Undo2, X } from "lucide-react"
import { type CSSProperties, useEffect, useState } from "react"
import { useTranslation } from "../../../context"
import type { CommitFileChange, CommitInfo } from "../../../../types"
import { Icon } from "../../Icons"
import { ResizeGrip } from "../../Resizable/Grip"
import { useResizable } from "../../../hooks"
import styles from "./style.module.scss"
import { useCopyFeedback } from "./useCopyFeedback"
import { DiffPreview } from "../../Diff/Preview"
import {
  COMMIT_DETAIL_MAX_WIDTH,
  COMMIT_DETAIL_MIN_WIDTH,
  COMMIT_DETAIL_WIDTH,
  HASH_SHORT_LENGTH,
} from "../../../../shared/constants/limits"

const DEFAULT_STORAGE_KEY = "commit.detail"
const DEFAULT_WIDTH = COMMIT_DETAIL_WIDTH
const MIN_WIDTH = COMMIT_DETAIL_MIN_WIDTH
const MAX_WIDTH = COMMIT_DETAIL_MAX_WIDTH
const SHORT_HASH_LENGTH = HASH_SHORT_LENGTH
const EMPTY_PARENT_LABEL = "—"

export type CommitDetailProps = {
  commit: CommitInfo | null
  copied?: boolean
  onCopy?: (hash: string) => void
  onClose?: () => void
  onCherryPick?: (hash: string) => void
  onRevert?: (hash: string) => void
  onReset?: (hash: string, mode: "soft" | "mixed" | "hard") => void
  onCheckout?: (hash: string) => void
  loadFiles?: (hash: string) => Promise<CommitFileChange[]>
  loadDiff?: (hash: string, file?: string) => Promise<string>
  className?: string
  resizable?: boolean
  storageKey?: string
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
}

function getParentShort(commit: CommitInfo): string {
  return commit.parents[0]?.slice(0, SHORT_HASH_LENGTH) ?? EMPTY_PARENT_LABEL
}

function formatParentShorts(commit: CommitInfo): string {
  return commit.parents.map((parent) => parent.slice(0, SHORT_HASH_LENGTH)).join(", ")
}

interface DetailHeaderProps {
  shortHash: string
  isCopied: boolean
  onCopy: () => void
  onClose?: () => void
}

function DetailHeader({ shortHash, isCopied, onCopy, onClose }: DetailHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.detailHead}>
      <strong>{shortHash}</strong>
      <div className={styles.detailHeadActions}>
        <button type="button" className="mini-btn" title={t("copyHash")} onClick={onCopy}>
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? t("copied") : t("copyHash")}
        </button>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} title={t("clear")} aria-label={t("clear")}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
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
  initialWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
}: CommitDetailProps) {
  const { t } = useTranslation()
  const detailWidth = useResizable({
    axis: "x",
    initial: initialWidth,
    min: minWidth,
    max: maxWidth,
    storageKey,
    invert: true,
  })
  const { isCopied, handleCopy } = useCopyFeedback(commit, copied, onCopy)

  const [files, setFiles] = useState<CommitFileChange[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [diffText, setDiffText] = useState<string>("")
  const [loadingDiff, setLoadingDiff] = useState(false)

  useEffect(() => {
    if (!commit) return
    setSelectedFile("")
    setDiffText("")
    if (loadFiles) {
      void loadFiles(commit.hash)
        .then(setFiles)
        .catch(() => setFiles([]))
    }
    if (loadDiff) {
      setLoadingDiff(true)
      void loadDiff(commit.hash)
        .then(setDiffText)
        .catch(() => setDiffText(""))
        .finally(() => setLoadingDiff(false))
    }
  }, [commit, loadFiles, loadDiff])

  const handleSelectFile = (file: string) => {
    const next = file === selectedFile ? "" : file
    setSelectedFile(next)
    if (commit && loadDiff) {
      setLoadingDiff(true)
      void loadDiff(commit.hash, next || undefined)
        .then(setDiffText)
        .catch(() => setDiffText(""))
        .finally(() => setLoadingDiff(false))
    }
  }

  if (!commit) return null

  const rootStyle = resizable ? ({ "--side-w": `${detailWidth.size}px` } as CSSProperties) : undefined

  return (
    <aside className={classnames(styles.detail, !resizable && styles.detailFixed, className)} style={rootStyle}>
      {resizable && <ResizeGrip axis="x" edge="start" grip={detailWidth.grip} />}
      <DetailHeader shortHash={commit.short} isCopied={isCopied} onCopy={() => void handleCopy()} onClose={onClose} />
      <Icon.Node.MiniGraph
        commit={commit}
        parentShort={getParentShort(commit)}
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
      {commit.parents.length > 0 && <p className={styles.meta}>← {formatParentShorts(commit)}</p>}

      <div className={styles.actionsToolbar}>
        {onCherryPick && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onCherryPick(commit.hash)}
            title={t("cherryPickCommit")}
          >
            <ListPlus size={12} />
            {t("cherryPick")}
          </button>
        )}
        {onRevert && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onRevert(commit.hash)}
            title={t("revertCommit")}
          >
            <Undo2 size={12} />
            {t("revertCommit")}
          </button>
        )}
        {onReset && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onReset(commit.hash, "mixed")}
            title={t("resetMixed")}
          >
            <RotateCcw size={12} />
            {t("resetToCommit")}
          </button>
        )}
        {onCheckout && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onCheckout(commit.hash)}
            title={t("checkout")}
          >
            <GitBranch size={12} />
            {t("checkout")}
          </button>
        )}
      </div>

      {files.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            {t("filesChanged")} ({files.length})
          </div>
          <div className={styles.filesList}>
            {files.map((file) => (
              <button
                type="button"
                key={file.path}
                className={classnames(styles.fileItem, selectedFile === file.path && styles.fileSelected)}
                onClick={() => handleSelectFile(file.path)}
                title={file.path}
              >
                <span
                  className={classnames(
                    styles.badge,
                    file.status === "A" && styles.badgeA,
                    file.status === "D" && styles.badgeD,
                    file.status === "M" && styles.badgeM,
                  )}
                >
                  {file.status}
                </span>
                <span>{file.path}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {diffText && (
        <>
          <div className={styles.sectionTitle}>
            <FileText size={11} /> Diff {selectedFile ? `: ${selectedFile}` : ""}
          </div>
          {loadingDiff ? (
            <p className={styles.meta}>{t("loading")}</p>
          ) : (
            <DiffPreview
              content={diffText}
              filePath={selectedFile}
              label={`Diff ${selectedFile}`}
              className={styles.diffPreview}
            />
          )}
        </>
      )}
    </aside>
  )
}
