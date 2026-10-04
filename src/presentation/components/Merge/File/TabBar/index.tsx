import { Check, ChevronDown, ChevronUp, Columns2, FileCode2 } from "lucide-react"
import { useTranslation } from "../../../../context"
import styles from "./style.module.scss"

interface Props {
  fileName: string
  count: number
  cursorLine: number
  hunkCurrent: number
  hunkTotal: number
  completeTitle: string
  completeDisabled: boolean
  onPrev: () => void
  onNext: () => void
  onCompare: () => void
  onComplete: () => void
}

export function FileTabBar(props: Props) {
  const {
    fileName,
    count,
    cursorLine,
    hunkCurrent,
    hunkTotal,
    completeTitle,
    completeDisabled,
    onPrev,
    onNext,
    onCompare,
    onComplete,
  } = props
  const { t, format } = useTranslation()
  const navDisabled = hunkTotal === 0
  return (
    <div className={styles.fileTabbar}>
      <span className={styles.fileTab} title={fileName}>
        <FileCode2 size={14} /> {fileName}
        <span className={styles.confCount}>
          {count} {t("conflictsTitle")}
        </span>
      </span>
      <span className={styles.cursorPos}>{format("lineColumn", { line: cursorLine, col: 1 })}</span>
      <div className="spacer" />
      <span className={styles.hunkNav}>
        {t("hunk")} {hunkCurrent} {t("of")} {hunkTotal}
      </span>
      <button type="button" className="mini-btn" onClick={onPrev} disabled={navDisabled} aria-label={t("prevHunk")}>
        <ChevronUp size={14} />
      </button>
      <button type="button" className="mini-btn" onClick={onNext} disabled={navDisabled} aria-label={t("nextHunk")}>
        <ChevronDown size={14} />
      </button>
      <button type="button" className="mini-btn wide" onClick={onCompare} disabled={navDisabled}>
        <Columns2 size={14} /> {t("acceptNeither")}
      </button>
      <button
        type="button"
        className="complete-btn"
        onClick={onComplete}
        disabled={completeDisabled}
        title={completeTitle}
      >
        <Check size={14} /> {t("completeMerge")}
      </button>
    </div>
  )
}
