import classnames from "classnames"
import type { Choice } from "../../../../../domain/entities/conflict/conflicts"
import type { ConflictBlock } from "../../../../../types"
import { useTranslation } from "../../../../context"
import styles from "./style.module.scss"

interface Props {
  block: ConflictBlock
  selected: boolean
  onSelect: () => void
  onAccept: (block: ConflictBlock, choice: Choice) => void
  onCompare: (block: ConflictBlock) => void
}

function VsCodeLines({ lines, startLn, tone }: { lines: string[]; startLn: number; tone: "cur" | "inc" | "base" }) {
  const { t } = useTranslation()
  const toneClass = tone === "cur" ? styles.cur : tone === "inc" ? styles.inc : styles.base
  if (lines.length === 0) {
    return (
      <div className={classnames(styles.codeRow, toneClass)}>
        <span className={styles.ln}>{startLn}</span>
        <span className={classnames(styles.lc, styles.emptyHint)}>{t("emptyPane")}</span>
      </div>
    )
  }
  return (
    <>
      {lines.map((l, i) => {
        const ln = startLn + i
        return (
          <div key={ln} className={classnames(styles.codeRow, toneClass)}>
            <span className={styles.ln}>{ln}</span>
            <span className={styles.lc}>{l === "" ? " " : l}</span>
          </div>
        )
      })}
    </>
  )
}

export function HunkBlock({ block, selected, onSelect, onAccept, onCompare }: Props) {
  const { t } = useTranslation()
  const currentLabel = block.current_label || "HEAD"
  const incomingLabel = block.incoming_label || "incoming"

  return (
    <div id={`hunk-${block.id}`} className={classnames(styles.hunk, selected && styles.selected)}>
      <div className={styles.codelens}>
        <button
          type="button"
          className="link"
          onClick={(e) => {
            e.stopPropagation()
            onAccept(block, "current")
          }}
        >
          {t("acceptCurrent")}
        </button>
        <span>|</span>
        <button
          type="button"
          className="link"
          onClick={(e) => {
            e.stopPropagation()
            onAccept(block, "incoming")
          }}
        >
          {t("acceptIncoming")}
        </button>
        <span>|</span>
        <button
          type="button"
          className="link"
          onClick={(e) => {
            e.stopPropagation()
            onAccept(block, "both")
          }}
        >
          {t("acceptBoth")}
        </button>
        <span>|</span>
        <button
          type="button"
          className="link"
          onClick={(e) => {
            e.stopPropagation()
            onCompare(block)
          }}
        >
          {t("acceptNeither")}
        </button>
      </div>

      <div className={classnames(styles.sec, styles.current)}>
        <button type="button" className={styles.secHeader} onClick={onSelect}>
          <span>{t("current")}</span>
          <span className={styles.secBranch}>{currentLabel}</span>
          <span className={styles.secRange}>L{block.start_line}</span>
        </button>
        <VsCodeLines lines={block.current} startLn={block.start_line + 1} tone="cur" />
        {block.is_diff3 && block.base.length > 0 && (
          <div className={styles.vscodeBase}>
            <div className={classnames(styles.secHeader, styles.base)}>
              <span>{t("base")}</span>
            </div>
            <VsCodeLines lines={block.base} startLn={block.base_start ?? block.start_line} tone="base" />
          </div>
        )}
      </div>

      <div className={classnames(styles.sec, styles.incoming)}>
        <button type="button" className={styles.secHeader} onClick={onSelect}>
          <span>{t("incoming")}</span>
          <span className={styles.secBranch}>{incomingLabel}</span>
          <span className={styles.secRange}>L{block.mid_line ?? block.start_line}</span>
        </button>
        <VsCodeLines lines={block.incoming} startLn={(block.mid_line ?? block.start_line) + 1} tone="inc" />
      </div>
    </div>
  )
}
