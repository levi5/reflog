import { Dialog } from "../../Dialog"
import { PreviewList } from "../Preview"
import { useTranslation } from "../../../context"
import type { AutomationAlias, AutomationRecipe } from "../../../../domain/entities/automations/automations"

interface ReviewModalProps {
  isOpen: boolean
  draftRecipe: AutomationRecipe
  aliases: AutomationAlias[]
  variableValues: Record<string, string>
  onClose: () => void
  onConfirm: () => void
}

export function ReviewModal({ isOpen, draftRecipe, aliases, variableValues, onClose, onConfirm }: ReviewModalProps) {
  const { t } = useTranslation()
  return (
    <Dialog.Confirm
      open={isOpen}
      title={t("reviewRun")}
      onCancel={onClose}
      onConfirm={onConfirm}
      confirmLabel={t("confirmRun")}
      cancelLabel={t("cancel")}
      size="lg"
    >
      <strong>{draftRecipe.name}</strong>
      <PreviewList draftRecipe={draftRecipe} aliases={aliases} variableValues={variableValues} />
    </Dialog.Confirm>
  )
}
