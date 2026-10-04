import { Search, X } from "lucide-react"
import { useCallback, useState } from "react"

import type { LogFilter } from "../../../../infrastructure/git/ipc-client"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

export interface HistorySearchPanelProps {
  onSearch: (filter: LogFilter) => void
  onClear: () => void
  active: boolean
  busy: boolean
  resultCount: number
}

const EMPTY: LogFilter = { author: "", grep: "", path: "", since: "", until: "", pickaxe: "" }

function isActive(filter: LogFilter): boolean {
  return Object.values(filter).some((value) => typeof value === "string" && value.trim() !== "")
}

export function HistorySearchPanel({ onSearch, onClear, active, busy, resultCount }: HistorySearchPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<LogFilter>(EMPTY)

  const setField = (key: keyof LogFilter, value: string) => setFilter((prev: LogFilter) => ({ ...prev, [key]: value }))

  const submit = useCallback(() => {
    if (!isActive(filter)) {
      onClear()
      return
    }
    onSearch({ ...filter, follow: filter.path !== undefined && filter.path.trim() !== "" })
  }, [filter, onClear, onSearch])

  const reset = useCallback(() => {
    setFilter(EMPTY)
    onClear()
  }, [onClear])

  return (
    <div className={styles.searchPanel}>
      <button
        type="button"
        className={open ? styles.headOpen : styles.head}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Search size={13} aria-hidden />
        <span>{t("historySearchTitle")}</span>
        {active && <span className={styles.badge}>{resultCount}</span>}
      </button>

      {open && (
        <div className={styles.body}>
          <label className={styles.field}>
            <span>{t("historySearchAuthor")}</span>
            <input
              value={filter.author ?? ""}
              aria-label={t("historySearchAuthor")}
              placeholder={t("historySearchAuthorPh")}
              onChange={(event) => setField("author", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t("historySearchMessage")}</span>
            <input
              value={filter.grep ?? ""}
              aria-label={t("historySearchMessage")}
              placeholder={t("historySearchMessagePh")}
              onChange={(event) => setField("grep", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t("historySearchPath")}</span>
            <input
              value={filter.path ?? ""}
              aria-label={t("historySearchPath")}
              placeholder={t("historySearchPathPh")}
              onChange={(event) => setField("path", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t("historySearchPickaxe")}</span>
            <input
              value={filter.pickaxe ?? ""}
              aria-label={t("historySearchPickaxe")}
              placeholder={t("historySearchPickaxePh")}
              onChange={(event) => setField("pickaxe", event.target.value)}
            />
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>{t("historySearchSince")}</span>
              <input
                value={filter.since ?? ""}
                aria-label={t("historySearchSince")}
                placeholder="2 weeks ago"
                onChange={(event) => setField("since", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>{t("historySearchUntil")}</span>
              <input
                value={filter.until ?? ""}
                aria-label={t("historySearchUntil")}
                placeholder="yesterday"
                onChange={(event) => setField("until", event.target.value)}
              />
            </label>
          </div>
          <p className={styles.hint}>{t("historySearchHint")}</p>
          <div className={styles.actions}>
            <button type="button" className="mini-btn" disabled={busy} onClick={submit}>
              {t("historySearchRun")}
            </button>
            <button type="button" className="mini-btn" disabled={busy || !active} onClick={reset}>
              <X size={12} /> {t("historySearchClear")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
