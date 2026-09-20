import { useTranslation } from "@/presentation/context"
import type { CommandConfirmDialogProps } from "@/types/components"
import { Dialog } from "../../Dialog"

export function CommandConfirmDialog({ command, onCancel, onConfirm }: CommandConfirmDialogProps) {
  const { t } = useTranslation()
  if (!command) return null

  return (
    <Dialog.Confirm
      open
      title={t("confirmTitle")}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmLabel={t("confirmRun")}
      cancelLabel={t("cancel")}
      command={command}
      warning={t("confirmDanger")}
    />
  )
}
