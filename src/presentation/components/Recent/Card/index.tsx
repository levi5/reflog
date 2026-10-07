import { mergeStatsUseCase } from "../../../../data"
import { ChevronDown, ChevronRight, History, Layers, Trash2, X } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { groupRecentsByFamily } from "../../../../shared/utils/recent-families"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

type Props = {
  recents: string[]
  busy?: boolean
  grouped?: boolean
  onSelect: (path: string) => void
  onRemove?: (path: string) => void
  onClear?: () => void
  emptyMessage?: string
  icon?: ReactNode
  title?: string
}

function RecentRow({
  recent,
  busy,
  onSelect,
  onRemove,
}: {
  recent: string
  busy: boolean
  onSelect: (path: string) => void
  onRemove?: (path: string) => void
}) {
  const { t } = useTranslation()
  return (
    <li className={styles.recentItem}>
      <button type="button" className={styles.recentBtn} disabled={busy} onClick={() => onSelect(recent)}>
        <strong>{mergeStatsUseCase.repoBaseName(recent)}</strong>
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
  )
}

export function RecentCard({
  recents,
  busy = false,
  grouped = true,
  onSelect,
  onRemove,
  onClear,
  emptyMessage,
  icon = <History size={14} />,
  title,
}: Props) {
  const { t, format } = useTranslation()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const families = useMemo(() => (grouped ? groupRecentsByFamily(recents) : []), [grouped, recents])

  const toggleFamily = (root: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(root)) next.delete(root)
      else next.add(root)
      return next
    })
  }

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
      ) : !grouped ? (
        <ul className={styles.recentList}>
          {recents.map((recent) => (
            <RecentRow key={recent} recent={recent} busy={busy} onSelect={onSelect} onRemove={onRemove} />
          ))}
        </ul>
      ) : (
        <div className={styles.recentGroups}>
          {families.map((family) =>
            family.paths.length === 1 ? (
              <ul key={family.root} className={styles.recentList}>
                <RecentRow recent={family.paths[0]} busy={busy} onSelect={onSelect} onRemove={onRemove} />
              </ul>
            ) : (
              <section key={family.root} className={styles.familyGroup} aria-label={family.root}>
                <button
                  type="button"
                  className={styles.familyHead}
                  onClick={() => toggleFamily(family.root)}
                  aria-expanded={expanded.has(family.root)}
                  title={family.root}
                >
                  {expanded.has(family.root) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <Layers size={13} />
                  <strong>{family.name}</strong>
                  <span className={styles.familyCount}>
                    {format("recentFamilyCount", { count: family.paths.length })}
                  </span>
                </button>
                {expanded.has(family.root) && (
                  <ul className={`${styles.recentList} ${styles.familyList}`}>
                    {family.paths.map((recent) => (
                      <RecentRow key={recent} recent={recent} busy={busy} onSelect={onSelect} onRemove={onRemove} />
                    ))}
                  </ul>
                )}
              </section>
            ),
          )}
        </div>
      )}
    </div>
  )
}
