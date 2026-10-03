import classnames from "classnames"
import { Circle, CircleCheck, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { memo, useCallback } from "react"
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

const statusTone = (fileStatus: FileStatus, staged: boolean): string =>
  fileStatus.unmerged ? styles.warn : staged ? styles.ok : styles.pend

const statusLabel = (translate: Translate, fileStatus: FileStatus): string =>
  `${fileStatus.x}${fileStatus.y} · ${
    fileStatus.unmerged ? translate("unmerged") : fileStatus.staged ? translate("staged") : translate("unstaged")
  }`

export interface FileStatusRowProps {
  fileStatus: FileStatus
  staged: boolean
  isSelected: boolean
  detailed: boolean
  selection?: FileCheckSelection
  actions?: ReactNode
  onSelect: (filePath: string, staged: boolean, range: boolean) => void
}

export const FileStatusRow = memo(function FileStatusRow({
  fileStatus,
  staged,
  isSelected,
  detailed,
  selection,
  actions,
  onSelect,
}: FileStatusRowProps) {
  const { t } = useTranslation()
  const Icon = fileStatus.unmerged ? TriangleAlert : staged ? CircleCheck : Circle
  return (
    <div className={classnames(styles.fcard, isSelected && styles.active)}>
      {selection !== undefined && (
        <input
          type="checkbox"
          className={styles.fcheck}
          checked={selection.checked.has(fileStatus.path)}
          aria-label={fileStatus.path}
          onChange={(event) => {
            const native = event.nativeEvent as MouseEvent | undefined
            selection.onToggle(fileStatus.path, native?.shiftKey ?? false)
          }}
        />
      )}
      <button
        type="button"
        className={styles.fselect}
        onClick={(event) => onSelect(fileStatus.path, staged, event.shiftKey)}
        aria-pressed={isSelected}
        aria-label={fileStatus.path}
      >
        <span className={classnames(styles.fico, statusTone(fileStatus, staged))} title={statusLabel(t, fileStatus)}>
          <Icon size={16} />
        </span>
        <span className={styles.fmeta}>
          <span className={styles.fname} title={fileStatus.path}>
            {fileStatus.path}
          </span>
          {detailed && <small>{statusLabel(t, fileStatus)}</small>}
        </span>
      </button>
      {actions && <span className={styles.factions}>{actions}</span>}
    </div>
  )
})

export function StatusFileList({ files, selectedFilePath, detailed, onSelect, selection }: StatusFileListProps) {
  const { t } = useTranslation()
  const handleSelect = useCallback(
    (filePath: string, staged: boolean, range: boolean) =>
      range && selection ? selection.onToggle(filePath, true) : onSelect(filePath, staged),
    [onSelect, selection],
  )
  return files.length === 0 ? (
    <EmptyState small message={t("noChanges")} />
  ) : (
    files.map((fileStatus) => (
      <FileStatusRow
        key={fileStatus.path}
        fileStatus={fileStatus}
        staged={fileStatus.staged}
        isSelected={fileStatus.path === selectedFilePath}
        detailed={detailed}
        selection={selection}
        onSelect={handleSelect}
      />
    ))
  )
}
