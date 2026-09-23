import { Play } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { CommitInfo, RebaseOp, RebaseOpAction } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { EmptyState } from "../../../Empty/State"
import { RebaseRow } from "../Row"
import styles from "../Strip/style.module.scss"

interface RebaseFormProps {
  defaultOnto: string
  commits: CommitInfo[]
  loading: boolean
  error: string | null
  busy: boolean
  onLoad: (onto: string) => void
  onApply: (onto: string, ops: RebaseOp[]) => void
}

export function RebaseForm({ defaultOnto, commits, loading, error, busy, onLoad, onApply }: RebaseFormProps) {
  const { t } = useTranslation()
  const [onto, setOnto] = useState(defaultOnto)
  const [order, setOrder] = useState<string[]>([])
  const [actions, setActions] = useState<Record<string, RebaseOpAction>>({})

  useEffect(() => {
    setOnto(defaultOnto)
  }, [defaultOnto])

  useEffect(() => {
    setOrder([...commits].reverse().map((c) => c.hash))
    setActions({})
  }, [commits])

  const byHash = useMemo(() => new Map(commits.map((c) => [c.hash, c])), [commits])
  const rows = useMemo(
    () => order.map((hash) => byHash.get(hash)).filter((c): c is CommitInfo => c !== undefined),
    [order, byHash],
  )

  const move = (hash: string, delta: -1 | 1) =>
    setOrder((prev) => {
      const index = prev.indexOf(hash)
      const target = index + delta
      const rest = [...prev.slice(0, index), ...prev.slice(index + 1)]
      return index === -1 || target < 0 || target >= prev.length
        ? prev
        : [...rest.slice(0, target), hash, ...rest.slice(target)]
    })

  const handleApply = () => {
    const trimmed = onto.trim()
    return trimmed === "" || rows.length === 0 || busy
      ? undefined
      : onApply(
          trimmed,
          rows.map((c) => ({ hash: c.hash, action: actions[c.hash] ?? "pick" })),
        )
  }

  return (
    <>
      <div className={styles.rebaseOntoRow}>
        <label className={styles.rebaseOntoLabel} htmlFor="rebase-onto">
          {t("rebaseOnto")}
        </label>
        <input
          id="rebase-onto"
          className={styles.rebaseOntoInput}
          value={onto}
          onChange={(e) => setOnto(e.target.value)}
          placeholder={defaultOnto}
          spellCheck={false}
        />
        <button
          type="button"
          className="mini-btn"
          onClick={() => (onto.trim() === "" ? undefined : onLoad(onto.trim()))}
          disabled={busy || !onto.trim()}
        >
          {t("rebaseLoad")}
        </button>
      </div>

      {error !== null && (
        <p className={styles.rebaseError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.rebaseList}>
        {loading ? (
          <EmptyState small message={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState small message={t("rebaseNoCommits")} />
        ) : (
          rows.map((c, index) => (
            <RebaseRow
              key={c.hash}
              commit={c}
              action={actions[c.hash] ?? "pick"}
              first={index === 0}
              last={index === rows.length - 1}
              onAction={(v) => setActions((prev) => ({ ...prev, [c.hash]: v as RebaseOpAction }))}
              onMove={(delta) => move(c.hash, delta)}
            />
          ))
        )}
      </div>

      {rows.length > 0 && (
        <div className={styles.rebaseFoot}>
          <button type="button" className="mini-btn primary" onClick={handleApply} disabled={busy}>
            <Play size={13} /> {t("applyRebase")}
          </button>
        </div>
      )}
    </>
  )
}
