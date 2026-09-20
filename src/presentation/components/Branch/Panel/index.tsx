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
  onDeleteBranch: (branchName: string) => void
  onRenameBranch: (oldName: string, newName: string) => void
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
}: BranchPanelProps) {
  const [renamingBranchName, setRenamingBranchName] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")

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
      <BranchCreateForm
        newBranchName={newBranchName}
        onNewBranchNameChange={onNewBranchNameChange}
        onCreateBranch={onCreateBranch}
      />
      {branches.length === 0 && <span className={styles.hint}>{currentBranchName}</span>}
      {branches.map((branch, index) => (
        <BranchCard
          key={branch.name}
          branch={branch}
          index={index}
          isRenaming={renamingBranchName === branch.name}
          draftName={renameDraft}
          onDraftNameChange={setRenameDraft}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
          onCheckoutBranch={onCheckoutBranch}
          onDeleteBranch={onDeleteBranch}
          onStartRename={startRename}
        />
      ))}
    </>
  )
}
