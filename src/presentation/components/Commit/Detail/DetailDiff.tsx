import { FileText } from "lucide-react"
import { useTranslation } from "../../../context"
import { MAX_DIFF_BYTES, MAX_DIFF_LINES } from "../../../../shared/constants/limits"
import { DiffPreview } from "../../Diff/Preview"
import styles from "./style.module.scss"

interface DetailDiffProps {
  selectedFile: string
  diffText: string
  error: string
  loading: boolean
}

function exceedsDiffLimits(diff: string): boolean {
  if (diff.length > MAX_DIFF_BYTES) return true
  let lines = 1
  for (const character of diff) {
    if (character === "\n") lines += 1
    if (lines > MAX_DIFF_LINES) return true
  }
  return false
}

export function DetailDiff({ selectedFile, diffText, error, loading }: DetailDiffProps) {
  const { t } = useTranslation()
  if (!selectedFile || (!loading && !diffText && !error)) return null

  return (
    <>
      <div className={styles.sectionTitle}>
        <FileText size={11} /> Diff: {selectedFile}
      </div>
      {loading ? (
        <div className={styles.skeletonDiff} role="status" aria-busy aria-label={t("loading")}>
          <i />
          <i />
          <i />
        </div>
      ) : error ? (
        <div className={styles.diffError} role="alert">
          {error}
        </div>
      ) : exceedsDiffLimits(diffText) ? (
        <div className={styles.largeDiff}>
          <span>{t("largeDiffPreview")}</span>
          <pre>{diffText.slice(0, MAX_DIFF_BYTES)}</pre>
        </div>
      ) : (
        <DiffPreview
          content={diffText}
          filePath={selectedFile}
          label={`Diff ${selectedFile}`}
          className={styles.diffPreview}
        />
      )}
    </>
  )
}
