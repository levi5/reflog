import classnames from "classnames"
import { Check, Copy, FileText, GitBranch, ListPlus, RotateCcw, Undo2, X } from "lucide-react"
import { type CSSProperties, useEffect, useRef, useState } from "react"
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
  MAX_DIFF_BYTES,
  MAX_DIFF_LINES,
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
  expanded?: boolean
}

function isLargeDiff(content: string): boolean {
  if (content.length > MAX_DIFF_BYTES) return true
  let lines = 1
  for (const char of content) {
    if (char === "\n") lines += 1
    if (lines > MAX_DIFF_LINES) return true
  }
  return false
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
  })
  const { isCopied, handleCopy } = useCopyFeedback(commit, copied, onCopy)

  const [files, setFiles] = useState<CommitFileChange[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [diffText, setDiffText] = useState<string>("")
  const [loadingDiff, setLoadingDiff] = useState(false)
  const diffCacheRef = useRef(new Map<string, string>())
  const filesRequestRef = useRef(0)
  const diffRequestRef = useRef(0)

  useEffect(() => {
    if (!commit) return
    diffRequestRef.current += 1
    setSelectedFile("")
    setDiffText("")
    setLoadingDiff(false)
    setFiles([])
    setLoadingFiles(false)
    if (loadFiles) {
      const request = filesRequestRef.current + 1
      filesRequestRef.current = request
      setLoadingFiles(true)
      void loadFiles(commit.hash)
        .then((nextFiles) => {
          if (request === filesRequestRef.current) setFiles(nextFiles)
        })
        .catch(() => {
          if (request === filesRequestRef.current) setFiles([])
        })
        .finally(() => {
          if (request === filesRequestRef.current) setLoadingFiles(false)
        })
    }
  }, [commit, loadFiles])

  const handleSelectFile = (file: string) => {
    const next = file === selectedFile ? "" : file
    diffRequestRef.current += 1
    setSelectedFile(next)
    setDiffText("")
    if (!commit || !loadDiff || !next) return

    const key = `${commit.hash}:${next}`
    const cached = diffCacheRef.current.get(key)
    if (cached !== undefined) {
      setDiffText(cached)
      return
    }

    const request = diffRequestRef.current
    setLoadingDiff(true)
    void loadDiff(commit.hash, next)
      .then((diff) => {
        diffCacheRef.current.set(key, diff)
        if (request === diffRequestRef.current) setDiffText(diff)
      })
      .catch(() => {
        if (request === diffRequestRef.current) setDiffText("")
      })
      .finally(() => {
        if (request === diffRequestRef.current) setLoadingDiff(false)
      })
  }

  if (!commit) return null

  const rootStyle = resizable ? ({ "--side-w": `${detailWidth.size}px` } as CSSProperties) : undefined

  const largeDiff = isLargeDiff(diffText)

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

      {(loadingFiles || files.length > 0) && (
        <>
          <div className={styles.sectionTitle}>
            {t("filesChanged")}
            {!loadingFiles && ` (${files.length})`}
          </div>
          <div className={styles.filesList} aria-busy={loadingFiles}>
            {loadingFiles ? (
              <div className={styles.skeletonList} role="status" aria-label={t("loading")}>
                <i />
                <i />
                <i />
              </div>
            ) : (
              files.map((file) => (
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
                  <span>{file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {selectedFile && (loadingDiff || diffText) && (
        <>
          <div className={styles.sectionTitle}>
            <FileText size={11} /> Diff {selectedFile ? `: ${selectedFile}` : ""}
          </div>
          {loadingDiff ? (
            <div className={styles.skeletonDiff} role="status" aria-busy aria-label={t("loading")}>
              <i />
              <i />
              <i />
            </div>
          ) : largeDiff ? (
            <div className={styles.largeDiff}>
              <span>{t("largeDiffPreview")}</span>
              <pre>{diffText.slice(0, MAX_DIFF_BYTES)}</pre>
            </div>
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
