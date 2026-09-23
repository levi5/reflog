import classnames from "classnames"
import { AlertCircle, CheckCircle2, Info, Loader2, MessageSquare, X } from "lucide-react"
import { useTranslation } from "../../context"
import type { MessageItem as MessageItemType, MessageType } from "../../context"
import styles from "./styles.module.scss"

interface ToastItemProps {
  message: MessageItemType
  onDismiss: (id: string) => void
}

function ToastIcon({ type }: { type: MessageType }) {
  const iconSize = 18

  if (type === "loading") {
    return <Loader2 size={iconSize} className={styles.spinner} />
  }

  if (type === "error") {
    return <AlertCircle size={iconSize} />
  }

  if (type === "success") {
    return <CheckCircle2 size={iconSize} />
  }

  if (type === "response") {
    return <MessageSquare size={iconSize} />
  }

  return <Info size={iconSize} />
}

export function ToastItemView({ message, onDismiss }: ToastItemProps) {
  const { id, type, title, text, action } = message
  const { t } = useTranslation()
  const role = type === "error" ? "alert" : "status"

  return (
    <div className={classnames(styles.toastItem, styles[type])} role={role} aria-live="polite">
      <div className={styles.iconWrapper}>
        <ToastIcon type={type} />
      </div>
      <div className={styles.contentWrapper}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.text}>{text}</div>
        {action && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              action.onAction()
              onDismiss(id)
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button type="button" className={styles.closeButton} onClick={() => onDismiss(id)} aria-label={t("close")}>
        <X size={14} />
      </button>
    </div>
  )
}
