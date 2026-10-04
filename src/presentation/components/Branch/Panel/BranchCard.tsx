import { ArrowDown, ArrowUp, Circle, CircleDot, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "../../../context"
import type { BranchInfo } from "../../../../types"
import { ListItem } from "../../List/Item"
import styles from "./style.module.scss"

interface BranchRenameInputProps {
  draftName: string
  onDraftNameChange: (draftName: string) => void
  onCommit: () => void
  onCancel: () => void
}

function BranchRenameInput({ draftName, onDraftNameChange, onCommit, onCancel }: BranchRenameInputProps) {
  return (
    <input
      className={styles.rename}
      value={draftName}
      ref={(inputElement) => inputElement?.focus()}
      onChange={(event) => onDraftNameChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit()
        if (event.key === "Escape") onCancel()
      }}
      onBlur={onCommit}
    />
  )
}

interface BranchCardActionsProps {
  branch: BranchInfo
  busy?: boolean
  onCheckoutBranch: (branchName: string) => void
  onDeleteBranch: (branchName: string, force?: boolean) => void
  onStartRename: (branchName: string) => void
  onConfirmDelete?: (branchName: string | null) => void
  confirmingDelete?: boolean
}

function BranchCardActions({
  branch,
  busy = false,
  onCheckoutBranch,
  onDeleteBranch,
  onStartRename,
  onConfirmDelete,
  confirmingDelete = false,
}: BranchCardActionsProps) {
  const { t } = useTranslation()
  if (branch.remote) {
    if (branch.current) return null
    return (
      <button
        type="button"
        className="mini-btn"
        disabled={busy}
        onClick={() => onCheckoutBranch(branch.name.replace(/^[^/]+\//, ""))}
      >
        {t("checkout")}
      </button>
    )
  }

  return (
    <span className={styles.rowBtns}>
      {!branch.current && (
        <button type="button" className="mini-btn" disabled={busy} onClick={() => onCheckoutBranch(branch.name)}>
          {t("checkout")}
        </button>
      )}
      <button
        type="button"
        className="mini-btn"
        title={t("renameBranch")}
        aria-label={`${t("renameBranch")}: ${branch.name}`}
        disabled={busy}
        onClick={() => onStartRename(branch.name)}
      >
        <Pencil size={12} />
      </button>
      {!branch.current &&
        (confirmingDelete && onConfirmDelete ? (
          <>
            <button
              type="button"
              className="mini-btn danger"
              disabled={busy}
              aria-label={`${t("forceDeleteBranch")}: ${branch.name}`}
              onClick={() => onDeleteBranch(branch.name, true)}
            >
              {t("forceDeleteBranch")}
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={busy}
              aria-label={t("cancel")}
              onClick={() => onConfirmDelete(null)}
            >
              {t("cancel")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="mini-btn"
            title={t("deleteBranch")}
            aria-label={`${t("deleteBranch")}: ${branch.name}`}
            disabled={busy}
            onClick={() => {
              if (onConfirmDelete) onConfirmDelete(branch.name)
              else onDeleteBranch(branch.name)
            }}
          >
            <Trash2 size={12} />
          </button>
        ))}
    </span>
  )
}

interface BranchCardProps {
  branch: BranchInfo
  index: number
  isRenaming: boolean
  draftName: string
  onDraftNameChange: (draftName: string) => void
  onCommitRename: () => void
  onCancelRename: () => void
  busy?: boolean
  onCheckoutBranch: (branchName: string) => void
  onDeleteBranch: (branchName: string, force?: boolean) => void
  onStartRename: (branchName: string) => void
  onConfirmDelete?: (branchName: string | null) => void
  confirmingDelete?: boolean
}

export function BranchCard({
  branch,
  index,
  isRenaming,
  draftName,
  onDraftNameChange,
  onCommitRename,
  onCancelRename,
  busy = false,
  onCheckoutBranch,
  onDeleteBranch,
  onStartRename,
  onConfirmDelete,
  confirmingDelete = false,
}: BranchCardProps) {
  const { t } = useTranslation()
  const BranchIcon = branch.current ? CircleDot : Circle
  const showRenameInput = isRenaming && !branch.remote
  const hasBehind = (branch.behind ?? 0) > 0
  const hasAhead = (branch.ahead ?? 0) > 0

  return (
    <ListItem
      className={styles.fcard}
      active={branch.current}
      style={{ animationDelay: `${Math.min(index * 35, 350)}ms` }}
      title={
        <>
          <BranchIcon size={13} className={branch.current ? styles.currentDot : undefined} />{" "}
          {showRenameInput ? (
            <BranchRenameInput
              draftName={draftName}
              onDraftNameChange={onDraftNameChange}
              onCommit={onCommitRename}
              onCancel={onCancelRename}
            />
          ) : (
            branch.name
          )}
          {hasBehind && (
            <span className={styles.behindBadge} title={`${t("behindRemote")}: ${branch.behind}`}>
              <ArrowDown size={11} />
              {branch.behind}
            </span>
          )}
          {hasAhead && (
            <span className={styles.aheadBadge} title={`${t("aheadRemote")}: ${branch.ahead}`}>
              <ArrowUp size={11} />
              {branch.ahead}
            </span>
          )}
        </>
      }
      actions={
        <BranchCardActions
          branch={branch}
          busy={busy}
          onCheckoutBranch={onCheckoutBranch}
          onDeleteBranch={onDeleteBranch}
          onStartRename={onStartRename}
          onConfirmDelete={onConfirmDelete}
          confirmingDelete={confirmingDelete}
        />
      }
    />
  )
}
