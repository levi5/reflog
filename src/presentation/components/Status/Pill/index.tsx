import classnames from "classnames"
import { FileDiff, GitMerge } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "../../../context"
import styles from "./styles.module.scss"

export interface StatusPillProps {
  conflictCount: number
  changedCount: number
}

export function StatusPill({ conflictCount, changedCount }: StatusPillProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  if (conflictCount > 0) {
    const label = t("mergeConflictsTab")
    return (
      <button
        type="button"
        className={classnames(styles.repoPill, styles.alertPill)}
        title={label}
        aria-label={label}
        onClick={() => navigate("/merge")}
      >
        <GitMerge size={14} /> {conflictCount}
      </button>
    )
  }

  if (changedCount === 0) return null

  const label = t("stagingDiff")
  return (
    <button
      type="button"
      className={classnames(styles.repoPill, styles.filesPill)}
      title={label}
      aria-label={label}
      onClick={() => navigate("/staging")}
    >
      <FileDiff size={14} /> {changedCount}
    </button>
  )
}
