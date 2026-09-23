import { ListOrdered, X } from "lucide-react"
import type { CommitInfo, RebaseOp } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { RebaseBanner } from "../Banner"
import { RebaseForm } from "../Form"
import styles from "./style.module.scss"

interface RebaseStripProps {
  branch: string
  defaultOnto: string
  commits: CommitInfo[]
  loading: boolean
  error: string | null
  rebasing: boolean
  busy: boolean
  onLoad: (onto: string) => void
  onApply: (onto: string, ops: RebaseOp[]) => void
  onContinue: () => void
  onAbort: () => void
  onClose: () => void
}

export function RebaseStrip({
  branch,
  defaultOnto,
  commits,
  loading,
  error,
  rebasing,
  busy,
  onLoad,
  onApply,
  onContinue,
  onAbort,
  onClose,
}: RebaseStripProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.rebaseStrip}>
      <div className={styles.rebaseHead}>
        <span className={styles.rebaseTitle}>
          <ListOrdered size={14} /> <b>{t("interactiveRebase")}</b>
        </span>
        <span className={styles.rebaseOnto}>{branch}</span>
        <div className="spacer" />
        <button type="button" className="mini-btn" onClick={onClose} aria-label={t("close")}>
          <X size={13} />
        </button>
      </div>

      {rebasing ? (
        <RebaseBanner busy={busy} onContinue={onContinue} onAbort={onAbort} />
      ) : (
        <RebaseForm
          defaultOnto={defaultOnto}
          commits={commits}
          loading={loading}
          error={error}
          busy={busy}
          onLoad={onLoad}
          onApply={onApply}
        />
      )}
    </div>
  )
}
