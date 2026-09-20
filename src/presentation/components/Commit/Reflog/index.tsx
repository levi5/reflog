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

  const handleCopy = (hash: string, event: React.MouseEvent) => {
    event.stopPropagation()
    void navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 1500)
  }

  if (entries.length === 0) {
    return <EmptyState message={t("reflogEmpty")} />
  }

  return (
    <div className={styles.reflogList}>
      {entries.map((entry) => {
        const isSelected = selectedHash === entry.hash
        const isCopied = copiedHash === entry.hash

        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: clickable reflog row
          // biome-ignore lint/a11y/useKeyWithClickEvents: clickable reflog row
          <div
            key={`${entry.selector}-${entry.hash}`}
            className={classnames(styles.reflogItem, isSelected && styles.selected)}
            onClick={() => onSelect?.(entry)}
          >
            <div className={styles.topRow}>
              <span className={styles.selector}>{entry.selector}</span>
              <code className={styles.shortHash}>{entry.short}</code>
              <span className={styles.action} title={entry.action}>
                {entry.action}
              </span>
            </div>
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
                  onClick={(e) => handleCopy(entry.hash, e)}
                  title={t("copyHash")}
                >
                  {isCopied ? <Check size={11} /> : <Copy size={11} />}
                  {isCopied ? t("copied") : entry.short}
                </button>
                {onCheckout && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCheckout(entry.hash)
                    }}
                    title={t("checkout")}
                  >
                    <GitBranch size={11} />
                    {t("checkout")}
                  </button>
                )}
                {onReset && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onReset(entry.hash, "mixed")
                    }}
                    title={t("resetMixed")}
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                )}
                {onCherryPick && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCherryPick(entry.hash)
                    }}
                    title={t("cherryPick")}
                  >
                    {t("cherryPick")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
