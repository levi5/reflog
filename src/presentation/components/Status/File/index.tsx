import classnames from "classnames"
import { Circle, CircleCheck, TriangleAlert } from "lucide-react"
import { memo } from "react"
import type { StringKey } from "../../../../i18n"
import type { FileStatus } from "../../../../types"
import { useTranslation } from "../../../context"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

export interface FileCheckSelection {
  checked: ReadonlySet<string>
  onToggle: (filePath: string, range: boolean) => void
}

interface StatusFileListProps {
  files: FileStatus[]
  selectedFilePath: string
  detailed: boolean
  onSelect: (filePath: string, staged: boolean) => void
  selection?: FileCheckSelection
}

type Translate = (key: StringKey) => string

const statusTone = (fileStatus: FileStatus): string =>
  fileStatus.unmerged ? styles.warn : fileStatus.staged ? styles.ok : styles.pend

const statusLabel = (translate: Translate, fileStatus: FileStatus): string =>
  `${fileStatus.x}${fileStatus.y} · ${
    fileStatus.unmerged ? translate("unmerged") : fileStatus.staged ? translate("staged") : translate("unstaged")
  }`

interface StatusFileItemProps {
  fileStatus: FileStatus
  isSelected: boolean
  isChecked: boolean
  detailed: boolean
  showCheck: boolean
  onSelect: (filePath: string, staged: boolean, range: boolean) => void
  onToggle: (filePath: string, range: boolean) => void
}

const StatusFileItem = memo(function StatusFileItem({
  fileStatus,
  isSelected,
  isChecked,
  detailed,
  showCheck,
  onSelect,
  onToggle,
}: StatusFileItemProps) {
  const { t } = useTranslation()
  const Icon = fileStatus.unmerged ? TriangleAlert : fileStatus.staged ? CircleCheck : Circle
  return (
    <button
      type="button"
      className={classnames(styles.fcard, isSelected && styles.active)}
      onClick={(event) => onSelect(fileStatus.path, fileStatus.staged, event.shiftKey)}
    >
      {showCheck && (
        <input
          type="checkbox"
          className={styles.fcheck}
          checked={isChecked}
          aria-label={fileStatus.path}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            const native = event.nativeEvent as MouseEvent | undefined
            onToggle(fileStatus.path, native?.shiftKey ?? false)
          }}
        />
      )}
      <span className={classnames(styles.fico, statusTone(fileStatus))}>
        <Icon size={16} />
      </span>
      <span className={styles.fmeta}>
        <span className={styles.fname} title={fileStatus.path}>
          {fileStatus.path}
        </span>
        {detailed && <small>{statusLabel(t, fileStatus)}</small>}
      </span>
    </button>
  )
})

export function StatusFileList({ files, selectedFilePath, detailed, onSelect, selection }: StatusFileListProps) {
  const { t } = useTranslation()
  return files.length === 0 ? (
    <EmptyState small message={t("noChanges")} />
  ) : (
    files.map((fileStatus) => (
      <StatusFileItem
        key={fileStatus.path}
        fileStatus={fileStatus}
        isSelected={fileStatus.path === selectedFilePath}
        isChecked={selection?.checked.has(fileStatus.path) ?? false}
        detailed={detailed}
        showCheck={selection !== undefined}
        onSelect={(filePath, staged, range) =>
          range && selection ? selection.onToggle(filePath, true) : onSelect(filePath, staged)
        }
        onToggle={(filePath, range) => selection?.onToggle(filePath, range)}
      />
    ))
  )
}
