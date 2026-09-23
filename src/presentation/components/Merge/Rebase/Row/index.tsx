import classnames from "classnames"
import { ArrowDown, ArrowUp, Check } from "lucide-react"
import type { CommitInfo, RebaseOpAction } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { Select } from "../../../Select"
import styles from "../Strip/style.module.scss"

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "pick", label: "pick" },
  { value: "squash", label: "squash" },
  { value: "fixup", label: "fixup" },
  { value: "drop", label: "drop" },
]

const ACTION_TONES: Record<RebaseOpAction, string> = {
  pick: styles.tonePick,
  squash: styles.toneSquash,
  fixup: styles.toneSquash,
  drop: styles.toneDrop,
}

interface RebaseRowProps {
  commit: CommitInfo
  action: RebaseOpAction
  first: boolean
  last: boolean
  onAction: (action: string) => void
  onMove: (delta: -1 | 1) => void
}

export function RebaseRow({ commit, action, first, last, onAction, onMove }: RebaseRowProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.rebaseRow}>
      <span className={styles.rebaseMove}>
        <button type="button" className="mini-btn" onClick={() => onMove(-1)} disabled={first} aria-label={t("moveUp")}>
          <ArrowUp size={13} />
        </button>
        <button type="button" className="mini-btn" onClick={() => onMove(1)} disabled={last} aria-label={t("moveDown")}>
          <ArrowDown size={13} />
        </button>
      </span>
      <Select
        label={commit.short}
        value={action}
        options={ACTION_OPTIONS}
        buttonClassName={ACTION_TONES[action]}
        onChange={onAction}
      />
      <span className={styles.rok}>
        <Check size={13} />
      </span>
      <code>{commit.short}</code>
      <span className={classnames(styles.rmsg, action === "drop" && styles.struck)}>{commit.message}</span>
      {action === "drop" ? (
        <span className={styles.omitted}>{t("omitted")}</span>
      ) : (
        <span className={styles.rdate}>{commit.date}</span>
      )}
    </div>
  )
}
