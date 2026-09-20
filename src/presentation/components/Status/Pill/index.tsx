import classnames from "classnames"
import { FileDiff, GitMerge } from "lucide-react"
import { useTranslation } from "../../../context"
import styles from "./styles.module.scss"

export interface StatusPillProps {
  conflictCount: number
  changedCount: number
}

export function StatusPill({ conflictCount, changedCount }: StatusPillProps) {
  const { t } = useTranslation()
  if (conflictCount > 0) {
    return (
      <span className={classnames(styles.repoPill, styles.alertPill)} title={t("mergeConflictsTab")}>
        <GitMerge size={14} /> {conflictCount}
      </span>
    )
  }

  if (changedCount === 0) return null

  return (
    <span className={classnames(styles.repoPill, styles.filesPill)} title={t("stagingDiff")}>
      <FileDiff size={14} /> {changedCount}
    </span>
  )
}
