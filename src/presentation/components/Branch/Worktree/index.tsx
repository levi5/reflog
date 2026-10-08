import { FolderOpen, Lock, LockOpen, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { WorktreeInfo } from "../../../../types"
import { ActionButton } from "../../Button"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

interface WorktreePanelProps {
  worktrees: WorktreeInfo[]
  onAdd: (path: string, branch?: string, detach?: boolean) => void
  onRemove: (path: string, force?: boolean) => void
  onLock?: (path: string) => void
  onUnlock?: (path: string) => void
  onPrune?: () => void
  onOpen?: (path: string) => void
  busy?: boolean
}

export function WorktreePanel({
  worktrees,
  onAdd,
  onRemove,
  onLock,
  onUnlock,
  onPrune,
  onOpen,
  busy = false,
}: WorktreePanelProps) {
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
        {onPrune && (
          <button
            type="button"
            className={styles.addBtn}
            disabled={busy}
            onClick={onPrune}
            title={t("worktreePruneHint")}
          >
            {t("worktreePrune")}
          </button>
        )}
      </div>
      <div className={styles.worktreeList}>
        {worktrees.map((worktree) => {
          const lockAction = worktree.locked
            ? onUnlock && {
                icon: <LockOpen size={11} />,
                label: t("worktreeUnlock"),
                onClick: () => onUnlock(worktree.path),
              }
            : onLock && {
                icon: <Lock size={11} />,
                label: t("worktreeLock"),
                onClick: () => onLock(worktree.path),
              }
          return (
            <div key={worktree.path} className={styles.worktreeCard}>
              <div className={styles.cardHead}>
                <span className={styles.name}>
                  {worktree.branch ?? (worktree.detached ? t("detached") : worktree.path)}
                </span>
                {worktree.main && <span className={styles.mainBadge}>{t("worktreeMain")}</span>}
                {worktree.bare && <span className={styles.bareBadge}>bare</span>}
                {worktree.locked && <span className={styles.mainBadge}>{t("worktreeLockedBadge")}</span>}
                {worktree.prunable && <span className={styles.bareBadge}>{t("worktreePrunableBadge")}</span>}
              </div>
              <div className={styles.worktreePath}>{worktree.path}</div>
              <div className={styles.cardActions}>
                {onOpen && (
                  <ActionButton icon={<FolderOpen size={11} />} onClick={() => onOpen(worktree.path)}>
                    {t("open")}
                  </ActionButton>
                )}
                {!worktree.main && (
                  <>
                    <ActionButton
                      icon={<Trash2 size={11} />}
                      disabled={busy}
                      onClick={() => onRemove(worktree.path)}
                      title={t("worktreeRemove")}
                      tone="danger"
                    >
                      {t("worktreeRemove")}
                    </ActionButton>
                    {lockAction && (
                      <ActionButton
                        icon={lockAction.icon}
                        disabled={busy}
                        onClick={lockAction.onClick}
                        title={lockAction.label}
                      >
                        {lockAction.label}
                      </ActionButton>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
        {worktrees.length === 0 && <EmptyState small message={t("noWorktrees")} />}
      </div>
    </div>
  )
}
