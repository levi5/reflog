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
        {blocks.map((block, blockIndex) => (
          <button
            type="button"
            key={block.id}
            className={classnames(blockIndex === activeIndex && styles.on)}
            onClick={() => onSelect(blockIndex)}
            aria-label={`${t("hunk")} ${blockIndex + 1}`}
          />
        ))}
        {blocks.length === 0 && <i className={styles.done} />}
      </div>
    </>
  )
}
