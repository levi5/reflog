import classnames from "classnames"
import { Check, GripVertical, ListOrdered, Play, Sparkles, X, XCircle } from "lucide-react"
import { useState } from "react"
import type { CommitInfo } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { EmptyState } from "../../../Empty/State"
import { Select } from "../../../Select"
import styles from "./style.module.scss"

interface Props {
  branch: string
  log: CommitInfo[]
  onStub: () => void
  onClose: () => void
}

type RebaseAction = "pick" | "reword" | "edit" | "squash" | "fixup" | "drop"

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "pick", label: "pick" },
  { value: "reword", label: "reword" },
  { value: "edit", label: "edit" },
  { value: "squash", label: "squash" },
  { value: "fixup", label: "fixup" },
  { value: "drop", label: "drop" },
]

const toneFor = (action: RebaseAction): string => {
  switch (action) {
    case "pick":
      return styles.tonePick
    case "reword":
    case "edit":
      return styles.toneEdit
    case "squash":
    case "fixup":
      return styles.toneSquash
    case "drop":
      return styles.toneDrop
  }
}

export function RebaseStrip({ branch, log, onStub, onClose }: Props) {
  const { t } = useTranslation()
  const [actions, setActions] = useState<Record<string, RebaseAction>>({})
  const rows = log.slice(0, 4)

  const actionOf = (hash: string): RebaseAction => actions[hash] ?? "pick"

  const setAction = (hash: string) => (v: string) => setActions((prev) => ({ ...prev, [hash]: v as RebaseAction }))

  return (
    <div className={styles.rebaseStrip}>
      <div className={styles.rebaseHead}>
        <span className={styles.rebaseTitle}>
          <ListOrdered size={14} /> <b>{t("rebaseInProgress")}</b>
        </span>
        <span className={styles.rebaseOnto}>
          {t("rebasingOnto")} {branch}~3
        </span>
        <div className="spacer" />
        <button type="button" className="mini-btn" onClick={onStub}>
          <Sparkles size={13} /> {t("autoSquash")}
        </button>
        <button type="button" className="mini-btn danger-t" onClick={onStub}>
          <XCircle size={13} /> {t("abortRebase")}
        </button>
        <button type="button" className="mini-btn primary-t" onClick={onStub}>
          <Play size={13} /> {t("applyRebase")}
        </button>
        <button type="button" className="mini-btn" onClick={onClose} aria-label="close">
          <X size={13} />
        </button>
      </div>
      <div className={styles.rebaseList}>
        {rows.map((c) => {
          const action = actionOf(c.hash)
          return (
            <div key={c.hash} className={styles.rebaseRow}>
              <span className={styles.drag}>
                <GripVertical size={13} />
              </span>
              <Select
                label={c.short}
                value={action}
                options={ACTION_OPTIONS}
                buttonClassName={toneFor(action)}
                onChange={setAction(c.hash)}
              />
              <span className={styles.rok}>
                <Check size={13} />
              </span>
              <code>{c.short}</code>
              <span className={classnames(styles.rmsg, action === "drop" && styles.struck)}>{c.message}</span>
              {action === "drop" ? (
                <span className={styles.omitted}>{t("omitted")}</span>
              ) : (
                <span className={styles.rdate}>{c.date}</span>
              )}
            </div>
          )
        })}
        {rows.length === 0 && <EmptyState small message={t("noChanges")} />}
      </div>
    </div>
  )
}
