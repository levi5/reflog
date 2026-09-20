import { History, Trash2, X } from "lucide-react"
import type { ReactNode } from "react"
import { repoBaseName } from "../../../../main/adapters"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

type Props = {
  recents: string[]
  busy?: boolean
  onSelect: (path: string) => void
  onRemove?: (path: string) => void
  onClear?: () => void
  emptyMessage?: string
  icon?: ReactNode
  title?: string
}

export function RecentCard({
  recents,
  busy = false,
  onSelect,
  onRemove,
  onClear,
  emptyMessage,
  icon = <History size={14} />,
  title,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.recents}>
      <div className={styles.recentsHead}>
        <span className={styles.recentsTitle}>
          {icon}
          {title ?? t("recents")}
        </span>
        {onClear && recents.length > 0 && (
          <button type="button" className="icon-btn" onClick={onClear} title={t("clear")} aria-label={t("clear")}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {recents.length === 0 ? (
        <p className={styles.recentsEmpty}>{emptyMessage ?? t("welcomeNoRecents")}</p>
      ) : (
        <ul className={styles.recentList}>
          {recents.map((recent) => (
            <li key={recent} className={styles.recentItem}>
              <button type="button" className={styles.recentBtn} disabled={busy} onClick={() => onSelect(recent)}>
                <strong>{repoBaseName(recent)}</strong>
                <span>{recent}</span>
              </button>
              {onRemove && (
                <button
                  type="button"
                  className={styles.removeRecentBtn}
                  disabled={busy}
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(recent)
                  }}
                  title={t("removeRecent")}
                  aria-label={t("removeRecent")}
                >
                  <X size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
