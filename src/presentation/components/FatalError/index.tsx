import { AlertTriangle, RefreshCw, X } from "lucide-react"
import { useTranslation } from "../../context"
import styles from "./styles.module.scss"

interface FatalErrorProps {
  message: string
  onDismiss: () => void
  onRetry?: () => void
}

export function FatalError({ message, onDismiss, onRetry }: FatalErrorProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.overlay} role="alert" aria-live="assertive">
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.iconWrap} aria-hidden>
            <AlertTriangle size={20} />
          </span>
          <strong className={styles.title}>{t("fatalErrorTitle")}</strong>
          <button type="button" className={styles.closeBtn} onClick={onDismiss} aria-label={t("close")}>
            <X size={14} />
          </button>
        </header>

        <p className={styles.message}>{message}</p>

        <footer className={styles.footer}>
          {onRetry && (
            <button type="button" className={styles.retryBtn} onClick={onRetry}>
              <RefreshCw size={13} />
              {t("retryAction")}
            </button>
          )}
          <button type="button" className={styles.dismissBtn} onClick={onDismiss}>
            {t("dismiss")}
          </button>
        </footer>
      </div>
    </div>
  )
}
