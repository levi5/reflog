import classnames from "classnames"
import { useTranslation } from "../../../context"
import type { CommitFileChange } from "../../../../types"
import styles from "./style.module.scss"

const STATUS_BADGE_CLASS: Record<string, string | undefined> = {
  A: styles.badgeA,
  D: styles.badgeD,
  M: styles.badgeM,
}

interface DetailFilesProps {
  files: CommitFileChange[]
  selectedFile: string
  loading: boolean
  onSelect: (file: string) => void
}

function fileLabel(file: CommitFileChange): string {
  return file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path
}

export function DetailFiles({ files, selectedFile, loading, onSelect }: DetailFilesProps) {
  const { t } = useTranslation()
  if (!loading && files.length === 0) return null

  return (
    <>
      <div className={styles.sectionTitle}>
        {t("filesChanged")}
        {!loading && ` (${files.length})`}
      </div>
      <div className={styles.filesList} aria-busy={loading}>
        {loading ? (
          <div className={styles.skeletonList} role="status" aria-label={t("loading")}>
            <i />
            <i />
            <i />
          </div>
        ) : (
          files.map((file) => (
            <button
              type="button"
              key={file.path}
              className={classnames(styles.fileItem, selectedFile === file.path && styles.fileSelected)}
              onClick={() => onSelect(file.path)}
              title={file.path}
            >
              <span className={classnames(styles.badge, STATUS_BADGE_CLASS[file.status])}>{file.status}</span>
              <span>{fileLabel(file)}</span>
            </button>
          ))
        )}
      </div>
    </>
  )
}
