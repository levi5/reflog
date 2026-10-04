import classnames from "classnames"
import { Check, Copy, GitBranch, RotateCcw } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { ReflogEntry } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

interface ReflogListProps {
  entries: ReflogEntry[]
  selectedHash?: string
  onSelect?: (entry: ReflogEntry) => void
  onCheckout?: (hash: string) => void
  onReset?: (hash: string, mode: "soft" | "mixed" | "hard") => void
  onCherryPick?: (hash: string) => void
}

export function ReflogList({ entries, selectedHash, onSelect, onCheckout, onReset, onCherryPick }: ReflogListProps) {
  const { t } = useTranslation()
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const handleCopy = (hash: string) => {
    void navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 1500)
  }

  if (entries.length === 0) {
    return <EmptyState message={t("reflogEmpty")} />
  }

  return (
    <ul className={styles.reflogList} aria-label={t("reflog")}>
      {entries.map((entry) => {
        const isSelected = selectedHash === entry.hash
        const isCopied = copiedHash === entry.hash

        return (
          <li
            key={`${entry.selector}-${entry.hash}`}
            className={classnames(styles.reflogItem, isSelected && styles.selected)}
          >
            <button
              type="button"
              className={styles.reflogMain}
              aria-pressed={isSelected}
              aria-label={`${entry.selector} ${entry.short} ${entry.action}`}
              onClick={() => onSelect?.(entry)}
            >
              <div className={styles.topRow}>
                <span className={styles.selector}>{entry.selector}</span>
                <code className={styles.shortHash}>{entry.short}</code>
                <span className={styles.action} title={entry.action}>
                  {entry.action}
                </span>
              </div>
            </button>
            <div className={styles.metaRow}>
              <div className={styles.metaInfo}>
                <span>{entry.author}</span>
                <span>·</span>
                <span>{entry.date}</span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => handleCopy(entry.hash)}
                  title={t("copyHash")}
                  aria-label={`${t("copyHash")}: ${entry.short}`}
                >
                  {isCopied ? <Check size={11} /> : <Copy size={11} />}
                  {isCopied ? t("copied") : entry.short}
                </button>
                {onCheckout && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => onCheckout(entry.hash)}
                    title={t("checkout")}
                    aria-label={`${t("checkout")}: ${entry.short}`}
                  >
                    <GitBranch size={11} />
                    {t("checkout")}
                  </button>
                )}
                {onReset && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => onReset(entry.hash, "mixed")}
                    title={t("resetMixed")}
                    aria-label={`${t("resetMixed")}: ${entry.short}`}
                  >
                    <RotateCcw size={11} />
                    {t("reset")}
                  </button>
                )}
                {onCherryPick && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => onCherryPick(entry.hash)}
                    title={t("cherryPick")}
                    aria-label={`${t("cherryPick")}: ${entry.short}`}
                  >
                    {t("cherryPick")}
                  </button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
