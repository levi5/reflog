import type { ReactNode } from "react"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "../../../context"
import { Modal } from "../../Modal"
import styles from "./style.module.scss"

interface Props {
  open: boolean
  title: ReactNode
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: ReactNode
  cancelLabel?: ReactNode
  danger?: boolean
  confirmDisabled?: boolean
  size?: "sm" | "md" | "lg"
  command?: string
  warning?: ReactNode
  children?: ReactNode
}

export function Confirm({
  open,
  title,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  danger = true,
  confirmDisabled = false,
  size = "md",
  command,
  warning,
  children,
}: Props) {
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      size={size}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" onClick={onCancel}>
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            type="button"
            className={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {command && <code className={styles.command}>$ git {command}</code>}
      {children}
      {warning && (
        <p className={styles.warning}>
          <TriangleAlert size={13} /> {warning}
        </p>
      )}
    </Modal>
  )
}
