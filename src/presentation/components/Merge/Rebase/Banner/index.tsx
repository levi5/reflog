import { useTranslation } from "../../../../context"
import styles from "../Strip/style.module.scss"

interface RebaseBannerProps {
  busy: boolean
  onContinue: () => void
  onAbort: () => void
}

export function RebaseBanner({ busy, onContinue, onAbort }: RebaseBannerProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.rebaseBanner} role="status">
      <span>{t("rebaseInProgress")}</span>
      <div className={styles.rebaseBannerActions}>
        <button type="button" className="mini-btn primary" onClick={onContinue} disabled={busy}>
          {t("rebaseContinue")}
        </button>
        <button type="button" className="mini-btn danger" onClick={onAbort} disabled={busy}>
          {t("abortRebase")}
        </button>
      </div>
    </div>
  )
}
