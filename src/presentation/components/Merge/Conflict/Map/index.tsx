import classnames from "classnames"
import type { ConflictBlock } from "../../../../../types"
import { useTranslation } from "../../../../context"
import styles from "./style.module.scss"

interface Props {
  blocks: ConflictBlock[]
  activeIndex: number
  onSelect: (i: number) => void
}

export function ConflictMap({ blocks, activeIndex, onSelect }: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className={styles.conflictMap}>
        <span>{t("conflictMap")}</span>
        <span>
          {t("hunk")} {blocks.length === 0 ? 0 : activeIndex + 1} {t("of")} {blocks.length}
        </span>
      </div>
      <div className={styles.mapSegs}>
        {blocks.map((b, i) => (
          <button
            type="button"
            key={b.id}
            className={classnames(i === activeIndex && styles.on)}
            onClick={() => onSelect(i)}
            aria-label={`${t("hunk")} ${i + 1}`}
          />
        ))}
        {blocks.length === 0 && <i className={styles.done} />}
      </div>
    </>
  )
}
