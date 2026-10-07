import { FolderOpen, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { WorktreeInfo } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

interface WorktreePanelProps {
  worktrees: WorktreeInfo[]
  onAdd: (path: string, branch?: string, detach?: boolean) => void
  onRemove: (path: string, force?: boolean) => void
  onOpen?: (path: string) => void
  busy?: boolean
}

export function WorktreePanel({ worktrees, onAdd, onRemove, onOpen, busy = false }: WorktreePanelProps) {
  const { t } = useTranslation()
  const [path, setPath] = useState("")
  const [branch, setBranch] = useState("")

  const submit = () => {
    if (!path.trim()) return
    onAdd(path.trim(), branch.trim() || undefined, false)
    setPath("")
    setBranch("")
  }

  return (
    <div className={styles.worktreeContainer}>
      <div className={styles.form}>
        <input
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder={t("worktreePathPh")}
          aria-label={t("worktreePathPh")}
        />
        <input
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
          placeholder={t("worktreeBranchPh")}
          aria-label={t("worktreeBranchPh")}
        />
        <button type="button" className={styles.addBtn} disabled={busy || !path.trim()} onClick={submit}>
          <Plus size={12} /> {t("worktreeAdd")}
        </button>
      </div>
      <div className={styles.worktreeList}>
        {worktrees.map((worktree) => (
          <div key={worktree.path} className={styles.worktreeCard}>
            <div className={styles.cardHead}>
              <span className={styles.name}>
                {worktree.branch ?? (worktree.detached ? t("detached") : worktree.path)}
              </span>
              {worktree.main && <span className={styles.mainBadge}>{t("worktreeMain")}</span>}
              {worktree.bare && <span className={styles.bareBadge}>bare</span>}
            </div>
            <div className={styles.worktreePath}>{worktree.path}</div>
            <div className={styles.cardActions}>
              {onOpen && (
                <button type="button" className={styles.actionBtn} onClick={() => onOpen(worktree.path)}>
                  <FolderOpen size={11} /> {t("open")}
                </button>
              )}
              {!worktree.main && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy}
                  onClick={() => onRemove(worktree.path)}
                  title={t("worktreeRemove")}
                >
                  <Trash2 size={11} /> {t("worktreeRemove")}
                </button>
              )}
            </div>
          </div>
        ))}
        {worktrees.length === 0 && <EmptyState small message={t("noWorktrees")} />}
      </div>
    </div>
  )
}
