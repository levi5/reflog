import classnames from "classnames"
import { Check, Copy, GitBranch, RotateCcw } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useTranslation } from "../../../context"
import type { ReflogEntry } from "../../../../types"
import type { StringKey } from "../../../../i18n"
import { ActionButton } from "../../Button"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

type Translate = (key: StringKey) => string

interface ReflogListProps {
  entries: ReflogEntry[]
  selectedHash?: string
  onSelect?: (entry: ReflogEntry) => void
  onCheckout?: (hash: string) => void
  onReset?: (hash: string, mode: "soft" | "mixed" | "hard") => void
  onCherryPick?: (hash: string) => void
}

interface EntryHandlers {
  onCopy: (hash: string) => void
  onCheckout?: (hash: string) => void
  onReset?: (hash: string, mode: "soft" | "mixed" | "hard") => void
  onCherryPick?: (hash: string) => void
}

interface EntryAction {
  key: string
  icon?: ReactNode
  label: string
  text: string
  onClick: () => void
}

function buildEntryActions(
  entry: ReflogEntry,
  isCopied: boolean,
  translate: Translate,
  handlers: EntryHandlers,
): EntryAction[] {
  const actions: EntryAction[] = [
    {
      key: "copy",
      icon: isCopied ? <Check size={11} /> : <Copy size={11} />,
      label: translate("copyHash"),
      text: isCopied ? translate("copied") : entry.short,
      onClick: () => handlers.onCopy(entry.hash),
    },
  ]
  if (handlers.onCheckout) {
    actions.push({
      key: "checkout",
      icon: <GitBranch size={11} />,
      label: translate("checkout"),
      text: translate("checkout"),
      onClick: () => handlers.onCheckout?.(entry.hash),
    })
  }
  if (handlers.onReset) {
    actions.push({
      key: "reset",
      icon: <RotateCcw size={11} />,
      label: translate("resetMixed"),
      text: translate("reset"),
      onClick: () => handlers.onReset?.(entry.hash, "mixed"),
    })
  }
  if (handlers.onCherryPick) {
    actions.push({
      key: "cherryPick",
      label: translate("cherryPick"),
      text: translate("cherryPick"),
      onClick: () => handlers.onCherryPick?.(entry.hash),
    })
  }
  return actions
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
        const actions = buildEntryActions(entry, isCopied, t, { onCopy: handleCopy, onCheckout, onReset, onCherryPick })

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
                {actions.map((action) => (
                  <ActionButton
                    key={action.key}
                    icon={action.icon}
                    onClick={action.onClick}
                    title={action.label}
                    ariaLabel={`${action.label}: ${entry.short}`}
                  >
                    {action.text}
                  </ActionButton>
                ))}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
