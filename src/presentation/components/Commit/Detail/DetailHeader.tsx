import { Check, Copy, X } from "lucide-react"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

interface DetailHeaderProps {
  shortHash: string
  isCopied: boolean
  onCopy: () => void
  onClose?: () => void
}

export function DetailHeader({ shortHash, isCopied, onCopy, onClose }: DetailHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.detailHead}>
      <strong>{shortHash}</strong>
      <div className={styles.detailHeadActions}>
        <button type="button" className="mini-btn" title={t("copyHash")} onClick={onCopy}>
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? t("copied") : t("copyHash")}
        </button>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} title={t("clear")} aria-label={t("clear")}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
