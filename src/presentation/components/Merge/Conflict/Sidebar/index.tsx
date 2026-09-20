import classnames from "classnames"
import { CircleCheck, TriangleAlert } from "lucide-react"
import type { ConflictFile } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { EmptyState } from "../../../Empty/State"
import styles from "./style.module.scss"

export interface ResolvedEntry {
  path: string
  count: number
}

interface Props {
  conflicts: ConflictFile[]
  resolved: ResolvedEntry[]
  activePath: string
  filter: string
  progress: number
  progressLabel: string
  onFilter: (v: string) => void
  onSelect: (path: string) => void
}

const TONE: Record<string, string> = {
  "11": "pink",
  "10": "pink",
  "01": "amber",
  "00": "cyan",
}

const BADGE: Record<string, string> = {
  pink: "red",
  amber: "amber",
  cyan: "cyan",
}

const match = (path: string, filter: string) => {
  const q = filter.trim().toLowerCase()
  return q === "" || path.toLowerCase().includes(q)
}

const toneOf = (active: boolean, count: number): string => TONE[`${active ? 1 : 0}${count > 1 ? 1 : 0}`] ?? "cyan"

const hunkLabel = (count: number): string => `${count} hunk${count > 1 ? "s" : ""}`

export function ConflictSidebar(props: Props) {
  const { conflicts, resolved, activePath, filter, progress, progressLabel, onFilter, onSelect } = props
  const { t } = useTranslation()
  const visibleConflicts = conflicts.filter((f) => match(f.path, filter))
  const visibleResolved = resolved.filter((r) => match(r.path, filter))
  return (
    <>
      <div className={styles.sidePanel}>
        <div className={styles.sideHead}>
          <strong>{t("conflictedFiles").toUpperCase()}</strong>
          <span className={styles.pct}>{progressLabel}</span>
        </div>
        <div className={styles.progress}>
          <i className={styles.segOk} style={{ width: `${progress}%` }} />
          <i className={styles.segErr} style={{ width: `${100 - progress}%` }} />
        </div>
      </div>
      <input
        className={styles.filterInput}
        placeholder={t("searchFiles")}
        value={filter}
        onChange={(e) => onFilter(e.target.value)}
      />
      <div className={styles.fileCards}>
        {visibleResolved.map((r) => (
          <div key={r.path} className={classnames(styles.fcard, styles.clean)}>
            <span className={classnames(styles.fico, styles.ok)}>
              <CircleCheck size={16} />
            </span>
            <div className={styles.fmeta}>
              <span className={styles.fname} title={r.path}>
                {r.path}
              </span>
              <small className={styles.subOk}>{t("cleanHint")}</small>
            </div>
            <span className={classnames(styles.fbadge, styles.neutral)}>{t("clean")}</span>
          </div>
        ))}
        {visibleConflicts.map((f) => {
          const active = f.path === activePath
          const tone = toneOf(active, f.conflicts.length)
          return (
            <button
              type="button"
              key={f.path}
              className={classnames(styles.fcard, active ? styles.active : styles.pending)}
              onClick={() => onSelect(f.path)}
            >
              <span className={classnames(styles.fico, styles[tone])}>
                <TriangleAlert size={16} />
              </span>
              <div className={styles.fmeta}>
                <span className={styles.fname} title={f.path}>
                  {f.path}
                </span>
                <small className={classnames(active && styles.subErr)}>
                  {f.conflicts.length} {f.conflicts.length > 1 ? t("pendingInFile") : t("pendingRemaining")}
                </small>
              </div>
              <span className={classnames(styles.fbadge, styles[BADGE[tone]])}>{hunkLabel(f.conflicts.length)}</span>
            </button>
          )
        })}
        {visibleConflicts.length === 0 && visibleResolved.length === 0 && (
          <EmptyState small message={t("noConflicts")} />
        )}
      </div>
    </>
  )
}
