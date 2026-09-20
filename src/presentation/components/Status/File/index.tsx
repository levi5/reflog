import classnames from "classnames"
import { Circle, CircleCheck, TriangleAlert } from "lucide-react"
import type { StringKey } from "../../../../i18n"
import type { FileStatus } from "../../../../types"
import { useTranslation } from "../../../context"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

interface StatusFileListProps {
  files: FileStatus[]
  selectedFilePath: string
  detailed: boolean
  onSelect: (filePath: string, staged: boolean) => void
}

function StatusIcon({ fileStatus }: { fileStatus: FileStatus }) {
  if (fileStatus.unmerged) return <TriangleAlert size={16} />
  if (fileStatus.staged) return <CircleCheck size={16} />
  return <Circle size={16} />
}

function statusIconClass(fileStatus: FileStatus): string {
  if (fileStatus.unmerged) return styles.warn
  if (fileStatus.staged) return styles.ok
  return styles.pend
}

type Translate = (key: StringKey) => string

function describeFileStatus(translate: Translate, fileStatus: FileStatus): string {
  if (fileStatus.unmerged) {
    return `${fileStatus.x}${fileStatus.y} · ${translate("unmerged")}`
  }
  if (fileStatus.staged) {
    return `${fileStatus.x}${fileStatus.y} · ${translate("staged")}`
  }
  return `${fileStatus.x}${fileStatus.y} · ${translate("unstaged")}`
}

interface StatusFileItemProps {
  fileStatus: FileStatus
  isSelected: boolean
  detailed: boolean
  onSelect: (filePath: string, staged: boolean) => void
}

function StatusFileItem({ fileStatus, isSelected, detailed, onSelect }: StatusFileItemProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={classnames(styles.fcard, isSelected && styles.active)}
      onClick={() => onSelect(fileStatus.path, fileStatus.staged)}
    >
      <span className={classnames(styles.fico, statusIconClass(fileStatus))}>
        <StatusIcon fileStatus={fileStatus} />
      </span>
      <span className={styles.fmeta}>
        <span className={styles.fname} title={fileStatus.path}>
          {fileStatus.path}
        </span>
        {detailed && <small>{describeFileStatus(t, fileStatus)}</small>}
      </span>
    </button>
  )
}

export function StatusFileList({ files, selectedFilePath, detailed, onSelect }: StatusFileListProps) {
  const { t } = useTranslation()
  if (files.length === 0) {
    return <EmptyState small message={t("noChanges")} />
  }

  return (
    <>
      {files.map((fileStatus) => (
        <StatusFileItem
          key={fileStatus.path}
          fileStatus={fileStatus}
          isSelected={fileStatus.path === selectedFilePath}
          detailed={detailed}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}
