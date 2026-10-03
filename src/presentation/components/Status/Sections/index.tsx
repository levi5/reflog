import classnames from "classnames"
import { ChevronRight, Circle, CircleCheck, Minus, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { useMemo } from "react"
import type { FileStatus } from "../../../../types"
import { useTranslation } from "../../../context"
import { useCollapsedSections } from "../../../hooks"
import { EmptyState } from "../../Empty/State"
import { FileStatusRow, type FileCheckSelection } from "../File"
import { groupBySection, type SectionId } from "./section-groups"
import styles from "./style.module.scss"

interface StatusSectionsProps {
  files: FileStatus[]
  selectedFilePath: string
  selections: Record<SectionId, FileCheckSelection>
  onSelect: (filePath: string, staged: boolean) => void
  onStage: (filePath: string) => void
  onUnstage: (filePath: string) => void
  onDiscard: (filePath: string) => void
  onEdit: (filePath: string) => void
  onStageMany: (paths: string[]) => void
  onUnstageMany: (paths: string[]) => void
  onDiscardMany: (paths: string[]) => void
}

interface IconActionProps {
  title: string
  icon: ReactNode
  danger?: boolean
  onClick: () => void
}

function IconAction({ title, icon, danger = false, onClick }: IconActionProps) {
  return (
    <button
      type="button"
      className={classnames(styles.action, danger && styles.danger)}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

interface StatusSectionProps {
  id: SectionId
  label: string
  icon: ReactNode
  count: number
  collapsed: boolean
  actions?: ReactNode
  children: ReactNode
  onToggle: (id: SectionId) => void
}

function StatusSection({ id, label, icon, count, collapsed, actions, children, onToggle }: StatusSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!collapsed}
          onClick={() => onToggle(id)}
          title={label}
        >
          <ChevronRight size={13} className={classnames(styles.chev, !collapsed && styles.open)} />
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
          <span className={styles.count}>{count}</span>
        </button>
        {actions && <span className={styles.headActions}>{actions}</span>}
      </div>
      {!collapsed && <div className={styles.body}>{children}</div>}
    </section>
  )
}

const toPaths = (files: FileStatus[]): string[] => files.map((file) => file.path)

export function StatusSections({
  files,
  selectedFilePath,
  selections,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
  onEdit,
  onStageMany,
  onUnstageMany,
  onDiscardMany,
}: StatusSectionsProps) {
  const { t } = useTranslation()
  const { collapsed, toggle } = useCollapsedSections<SectionId>("staging.sections")
  const groups = useMemo(() => groupBySection(files), [files])

  const views = useMemo(
    () =>
      [
        {
          id: "conflicts" as const,
          label: t("mergeConflicts"),
          icon: <TriangleAlert size={13} />,
          files: groups.conflicts,
          staged: false,
          actions: (
            <IconAction
              title={t("resolveAllConflicts")}
              icon={<Plus size={13} />}
              onClick={() => onStageMany(toPaths(groups.conflicts))}
            />
          ),
        },
        {
          id: "staged" as const,
          label: t("stagedChanges"),
          icon: <CircleCheck size={13} />,
          files: groups.staged,
          staged: true,
          actions: (
            <IconAction
              title={t("unstageAllChanges")}
              icon={<Minus size={13} />}
              onClick={() => onUnstageMany(toPaths(groups.staged))}
            />
          ),
        },
        {
          id: "changes" as const,
          label: t("changes"),
          icon: <Circle size={13} />,
          files: groups.changes,
          staged: false,
          actions: (
            <>
              <IconAction
                title={t("stageAllChanges")}
                icon={<Plus size={13} />}
                onClick={() => onStageMany(toPaths(groups.changes))}
              />
              <IconAction
                title={t("discardAllChanges")}
                icon={<Trash2 size={13} />}
                danger
                onClick={() => onDiscardMany(toPaths(groups.changes))}
              />
            </>
          ),
        },
      ].filter((view) => view.files.length > 0),
    [groups, t, onStageMany, onUnstageMany, onDiscardMany],
  )

  const rowActions = (file: FileStatus, staged: boolean) =>
    staged ? (
      <>
        <IconAction title={t("unstageSelected")} icon={<Minus size={13} />} onClick={() => onUnstage(file.path)} />
        <IconAction title={t("editFile")} icon={<Pencil size={13} />} onClick={() => onEdit(file.path)} />
      </>
    ) : (
      <>
        <IconAction
          title={file.unmerged ? t("stageResolved") : t("stageSelected")}
          icon={<Plus size={13} />}
          onClick={() => onStage(file.path)}
        />
        {!file.unmerged && (
          <IconAction title={t("discard")} icon={<Trash2 size={13} />} danger onClick={() => onDiscard(file.path)} />
        )}
        <IconAction title={t("editFile")} icon={<Pencil size={13} />} onClick={() => onEdit(file.path)} />
      </>
    )

  const renderRows = (section: SectionId, staged: boolean, sectionFiles: FileStatus[]) => {
    const selection = selections[section]
    const onRowSelect = (filePath: string, rowStaged: boolean, range: boolean) => {
      if (range) selection.onToggle(filePath, true)
      else onSelect(filePath, rowStaged)
    }
    return sectionFiles.map((file) => (
      <FileStatusRow
        key={file.path}
        fileStatus={file}
        staged={staged}
        isSelected={file.path === selectedFilePath}
        detailed={false}
        selection={selection}
        onSelect={onRowSelect}
        actions={rowActions(file, staged)}
      />
    ))
  }

  if (views.length === 0) return <EmptyState small message={t("noChanges")} />

  return (
    <div className={styles.sections}>
      {views.map((view) => (
        <StatusSection
          key={view.id}
          id={view.id}
          label={view.label}
          icon={view.icon}
          count={view.files.length}
          collapsed={collapsed.has(view.id)}
          actions={view.actions}
          onToggle={toggle}
        >
          {renderRows(view.id, view.staged, view.files)}
        </StatusSection>
      ))}
    </div>
  )
}
