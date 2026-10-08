import { useTranslation } from "../../../context"
import { Modal } from "../../Modal"
import type { CommitDetailProps } from "../Detail"
import type { CommitInfo } from "../../../../types"
import { CommitDetail } from "../Detail"

type CommitDetailActions = Pick<
  CommitDetailProps,
  "onCherryPick" | "onRevert" | "onReset" | "onCheckout" | "loadFiles" | "loadDiff" | "storageKey"
>

export type CommitDetailModalProps = CommitDetailActions & {
  commit: CommitInfo | null
  onClose: () => void
}

export function CommitDetailModal({ commit, onClose, ...actions }: CommitDetailModalProps) {
  const { t } = useTranslation()
  if (!commit) return null
  return (
    <Modal title={t("commitDetails")} size="lg" onClose={onClose}>
      <CommitDetail commit={commit} expanded resizable={false} {...actions} />
    </Modal>
  )
}
