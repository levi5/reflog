import { ChevronDown, ChevronRight, File as FileIcon, Folder as FolderIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "../../context"
import type { FileStatus, FileTreeNode } from "../../../types"
import { buildFileTree, filterTree } from "./build-file-tree"
import { EmptyState } from "../Empty/State"
import styles from "./style.module.scss"

interface ExplorerTreeProps {
  trackedFiles: string[]
  statusFiles: FileStatus[]
  query?: string
  selectedFilePath?: string | null
  onSelect?: (filePath: string, staged: boolean) => void
  onStage?: (filePath: string) => void
  onUnstage?: (filePath: string) => void
  busy?: boolean
}

function TreeNode({
  node,
  depth,
  selectedFilePath,
  onSelect,
  onStage,
  onUnstage,
  busy,
}: {
  node: FileTreeNode
  depth: number
  selectedFilePath?: string | null
  onSelect?: (filePath: string, staged: boolean) => void
  onStage?: (filePath: string) => void
  onUnstage?: (filePath: string) => void
  busy?: boolean
}) {
  const [open, setOpen] = useState(depth < 2)
  if (node.isDir) {
    return (
      <div className={styles.dirBlock}>
        <button
          type="button"
          className={styles.dirRow}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <FolderIcon size={13} />
          <span className={styles.dirName}>{node.name}</span>
          <span className={styles.dirCount}>{node.children.length}</span>
        </button>
        {open && (
          <div className={styles.dirChildren}>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFilePath={selectedFilePath}
                onSelect={onSelect}
                onStage={onStage}
                onUnstage={onUnstage}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
  const selected = selectedFilePath === node.path
  return (
    <div
      className={`${styles.fileRow} ${selected ? styles.fileRowSelected : ""}`}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <button
        type="button"
        className={styles.fileMain}
        onClick={() => onSelect?.(node.path, node.staged ?? false)}
        title={node.path}
      >
        <FileIcon size={13} />
        <span className={styles.fileName}>{node.name}</span>
        {node.status && (
          <span className={`${styles.badge} ${node.staged ? styles.badgeStaged : ""}`}>
            {node.status.trim() || "•"}
          </span>
        )}
      </button>
      {node.status && (
        <span className={styles.fileActions}>
          {node.staged ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUnstage?.(node.path)}
              aria-label={`Unstage ${node.path}`}
            >
              ‒
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStage?.(node.path)}
              aria-label={`Stage ${node.path}`}
            >
              +
            </button>
          )}
        </span>
      )}
    </div>
  )
}

export function ExplorerTree({
  trackedFiles,
  statusFiles,
  query = "",
  selectedFilePath,
  onSelect,
  onStage,
  onUnstage,
  busy = false,
}: ExplorerTreeProps) {
  const { t, format } = useTranslation()
  const tree = useMemo(() => buildFileTree(trackedFiles, statusFiles), [trackedFiles, statusFiles])
  const visible = useMemo(() => filterTree(tree, query), [tree, query])

  if (tree.length === 0) return <EmptyState small message={t("noItems")} />
  if (visible.length === 0) return <EmptyState small message={format("searchNoResultsFiles", { query })} />
  return (
    <div className={styles.explorer} role="tree" aria-label={t("fileExplorer")}>
      {visible.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedFilePath={selectedFilePath}
          onSelect={onSelect}
          onStage={onStage}
          onUnstage={onUnstage}
          busy={busy}
        />
      ))}
    </div>
  )
}
