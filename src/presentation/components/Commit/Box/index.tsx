import { useCommitTemplate } from "../../../hooks"
import { useTranslation } from "../../../context"
import { CommitForm } from "../Form"
import styles from "./style.module.scss"

interface Props {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  onStageAll: () => void
  repoPath?: string
  branch?: string
  hasStaged?: boolean
}

export function CommitBox({ value, onChange, onCommit, onStageAll, repoPath, branch, hasStaged = true }: Props) {
  const { t } = useTranslation()
  const api = useCommitTemplate({ value, onChange, repoPath, branch })
  const canCommit = api.canCommit && hasStaged

  const handleCommit = () => {
    if (!canCommit) return
    api.recordCommit()
    onCommit()
  }

  return (
    <form
      className={styles.commitBox}
      onSubmit={(e) => {
        e.preventDefault()
        handleCommit()
      }}
    >
      <CommitForm api={api} />
      {api.formatted.trim() && (
        <pre className={styles.preview} title={t("commitPreview")}>
          {api.formatted}
        </pre>
      )}
      <div className={styles.actions}>
        <button
          type="submit"
          className="primary"
          disabled={!canCommit}
          title={!hasStaged ? t("nothingStaged") : undefined}
        >
          {t("commit")}
        </button>
        <button type="button" onClick={onStageAll}>
          {t("stageAll")}
        </button>
      </div>
      {api.canCommit && !hasStaged && <p className={styles.hint}>{t("nothingStaged")}</p>}
    </form>
  )
}
