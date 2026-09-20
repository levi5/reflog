import { Eye, Play, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { StashItem } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

interface StashPanelProps {
  stashMessage: string
  onStashMessageChange: (stashMessage: string) => void
  onStash: () => void
  onPop: () => void
  stashes?: StashItem[]
  onApply?: (index: number) => void
  onDrop?: (index: number) => void
  onShowDiff?: (index: number) => Promise<string>
}

export function StashPanel({
  stashMessage,
  onStashMessageChange,
  onStash,
  onPop,
  stashes = [],
  onApply,
  onDrop,
  onShowDiff,
}: StashPanelProps) {
  const { t } = useTranslation()
  const [activeDiffIndex, setActiveDiffIndex] = useState<number | null>(null)
  const [diffText, setDiffText] = useState<string>("")
  const [loadingDiff, setLoadingDiff] = useState(false)

  const handleToggleDiff = async (index: number) => {
    if (activeDiffIndex === index) {
      setActiveDiffIndex(null)
      setDiffText("")
      return
    }
    setActiveDiffIndex(index)
    if (onShowDiff) {
      setLoadingDiff(true)
      try {
        const text = await onShowDiff(index)
        setDiffText(text || "No diff")
      } catch (e: unknown) {
        setDiffText(String(e))
      } finally {
        setLoadingDiff(false)
      }
    }
  }

  return (
    <div className={styles.stashContainer}>
      <div className={styles.rowFlex}>
        <input
          placeholder={`${t("stash")}...`}
          value={stashMessage}
          onChange={(event) => onStashMessageChange(event.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onStash()}
        />
        <button type="button" onClick={onStash} title={t("saveStash")}>
          {t("saveStash")}
        </button>
        <button type="button" onClick={onPop} title="Pop latest">
          Pop
        </button>
      </div>

      <div className={styles.stashList}>
        {stashes.map((stash) => {
          const isViewingDiff = activeDiffIndex === stash.index
          return (
            <div key={stash.selector} className={styles.stashCard}>
              <div className={styles.cardTop}>
                <span className={styles.selector}>{stash.selector}</span>
                <span className={styles.date}>{stash.date}</span>
              </div>
              <div className={styles.message}>{stash.message}</div>
              <div className={styles.cardActions}>
                {onApply && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => onApply(stash.index)}
                    title={t("stashApply")}
                  >
                    <Play size={11} /> {t("stashApply")}
                  </button>
                )}
                {onShowDiff && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => void handleToggleDiff(stash.index)}
                    title={t("stashViewDiff")}
                  >
                    <Eye size={11} /> {t("stashViewDiff")}
                  </button>
                )}
                {onDrop && (
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    onClick={() => onDrop(stash.index)}
                    title={t("stashDrop")}
                  >
                    <Trash2 size={11} /> {t("stashDrop")}
                  </button>
                )}
              </div>
              {isViewingDiff && <pre className={styles.diffBox}>{loadingDiff ? t("loading") : diffText}</pre>}
            </div>
          )
        })}
        {stashes.length === 0 && <EmptyState small message={t("noStashes")} />}
      </div>
    </div>
  )
}
