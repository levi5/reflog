import { GitBranchPlus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { BranchInfo } from "../../../../types"
import { InlineForm } from "../../Form/Inline"
import { BranchCard } from "./BranchCard"
import styles from "./style.module.scss"

interface BranchPanelProps {
  branches: BranchInfo[]
  currentBranchName: string
  newBranchName: string
  onNewBranchNameChange: (branchName: string) => void
  onCreateBranch: () => void
  onCheckoutBranch: (branchName: string) => void
  onDeleteBranch: (branchName: string, force?: boolean) => void
  onRenameBranch: (oldName: string, newName: string) => void
  onCreateBranchFrom?: (branchName: string, from: string) => void
  busy?: boolean
}

interface BranchCreateFormProps {
  newBranchName: string
  onNewBranchNameChange: (branchName: string) => void
  onCreateBranch: () => void
}

function BranchCreateForm({ newBranchName, onNewBranchNameChange, onCreateBranch }: BranchCreateFormProps) {
  const { t } = useTranslation()
  return (
    <InlineForm
      onSubmit={onCreateBranch}
      submitLabel={t("newBranch")}
      submitIcon={<GitBranchPlus size={14} />}
      disabled={!newBranchName.trim()}
    >
      <input
        aria-label={t("newBranch")}
        placeholder={t("newBranch")}
        value={newBranchName}
        onChange={(event) => onNewBranchNameChange(event.target.value)}
      />
    </InlineForm>
  )
}

export function BranchPanel({
  branches,
  currentBranchName,
  newBranchName,
  onNewBranchNameChange,
  onCreateBranch,
  onCheckoutBranch,
  onDeleteBranch,
  onRenameBranch,
  onCreateBranchFrom,
  busy = false,
}: BranchPanelProps) {
  const { t } = useTranslation()
  const [renamingBranchName, setRenamingBranchName] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const [fromDraft, setFromDraft] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const startRename = (branchName: string) => {
    setRenamingBranchName(branchName)
    setRenameDraft(branchName)
  }

  const cancelRename = () => {
    setRenamingBranchName(null)
    setRenameDraft("")
  }

  const commitRename = () => {
    const trimmedDraft = renameDraft.trim()
    if (renamingBranchName && trimmedDraft && trimmedDraft !== renamingBranchName) {
      onRenameBranch(renamingBranchName, trimmedDraft)
    }
    cancelRename()
  }

  return (
    <>
      {onCreateBranchFrom ? null : (
        <BranchCreateForm
          newBranchName={newBranchName}
          onNewBranchNameChange={onNewBranchNameChange}
          onCreateBranch={onCreateBranch}
        />
      )}
      {branches.length === 0 && <span className={styles.hint}>{currentBranchName || t("noBranches")}</span>}
      {onCreateBranchFrom && (
        <InlineForm
          onSubmit={() => {
            const name = newBranchName.trim()
            if (!name) return
            onCreateBranchFrom(name, fromDraft.trim())
            onNewBranchNameChange("")
            setFromDraft("")
          }}
          submitLabel={t("newBranchFrom")}
          submitIcon={<GitBranchPlus size={14} />}
          disabled={!newBranchName.trim()}
        >
          <input
            aria-label={t("newBranch")}
            placeholder={t("newBranch")}
            value={newBranchName}
            onChange={(event) => onNewBranchNameChange(event.target.value)}
          />
          <input
            aria-label={t("branchFromLabel")}
            placeholder={t("branchFromPlaceholder")}
            value={fromDraft}
            onChange={(event) => setFromDraft(event.target.value)}
          />
        </InlineForm>
      )}
      {branches.map((branch, index) => (
        <BranchCard
          key={branch.name}
          branch={branch}
          index={index}
          busy={busy}
          isRenaming={renamingBranchName === branch.name}
          draftName={renameDraft}
          onDraftNameChange={setRenameDraft}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
          onCheckoutBranch={onCheckoutBranch}
          onDeleteBranch={onDeleteBranch}
          onStartRename={startRename}
          onConfirmDelete={setConfirmDelete}
          confirmingDelete={confirmDelete === branch.name}
        />
      ))}
    </>
  )
}
