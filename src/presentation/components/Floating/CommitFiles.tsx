import { ChevronDown, FileDiff, Minus, Plus, Search } from "lucide-react"
import { useId, useState } from "react"
import type { FileStatus } from "../../../types"
import { useTranslation } from "../../context"
import type { FloatingOperation } from "./bridge"
import styles from "./workspace.module.scss"

type Group = "conflicts" | "staged" | "changes"

export function FloatingCommitFiles({
  files,
  disabled,
  onRun,
  onPreview,
}: {
  files: FileStatus[]
  disabled: boolean
  onRun: (operation: Extract<FloatingOperation, { kind: "stage" | "unstage" }>) => void
  onPreview: (file: FileStatus) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<Record<Group, boolean>>({ conflicts: true, staged: true, changes: true })
  const groups = [
    { id: "conflicts" as const, label: t("conflicts"), files: files.filter((file) => file.unmerged) },
    { id: "staged" as const, label: t("staged"), files: files.filter((file) => file.staged && !file.unmerged) },
    { id: "changes" as const, label: t("changes"), files: files.filter((file) => !file.unmerged && file.y !== " ") },
  ]
  const matches = (file: FileStatus) => file.path.toLowerCase().includes(query.trim().toLowerCase())

  return (
    <div className={styles.sourceControl}>
      <label className={styles.search}>
        <Search size={14} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("floatingSearchFiles")}
          aria-label={t("floatingSearchFiles")}
        />
      </label>
      <p className={styles.hint}>{t("floatingIndexHint")}</p>
      {groups.map((group) => {
        if (group.id === "conflicts" && !group.files.length) return null
        const staged = group.id === "staged"
        const conflict = group.id === "conflicts"
        const action = staged ? "unstage" : "stage"
        const label = t(staged ? "unstageAllChanges" : "stageAllChanges")
        const visible = group.files.filter(matches)
        return (
          <section className={styles.fileGroup} key={group.id} aria-label={group.label}>
            <header className={styles.groupHeader}>
              <button
                type="button"
                className={styles.groupToggle}
                aria-expanded={expanded[group.id]}
                aria-controls={`${id}-${group.id}`}
                onClick={() => setExpanded((previous) => ({ ...previous, [group.id]: !previous[group.id] }))}
              >
                <ChevronDown size={14} className={expanded[group.id] ? "" : styles.collapsedChevron} />
                <strong>{group.label}</strong>
                <span className={styles.groupCount}>{group.files.length}</span>
              </button>
              {!conflict && (
                <button
                  type="button"
                  className={styles.groupAction}
                  aria-label={label}
                  title={label}
                  disabled={disabled || !group.files.length}
                  onClick={() => onRun({ kind: action, paths: group.files.map((file) => file.path) })}
                >
                  {staged ? <Minus size={15} /> : <Plus size={15} />}
                </button>
              )}
            </header>
            <div id={`${id}-${group.id}`} hidden={!expanded[group.id]}>
              {!visible.length && (
                <p className={styles.groupEmpty}>{query.trim() ? t("floatingNoMatches") : t("noChanges")}</p>
              )}
              {visible.map((file) => {
                const separator = Math.max(file.path.lastIndexOf("/"), file.path.lastIndexOf("\\"))
                const name = file.path.slice(separator + 1)
                const directory = separator >= 0 ? file.path.slice(0, separator) : ""
                return (
                  <div className={styles.file} key={file.path}>
                    <FileDiff size={14} />
                    <button
                      type="button"
                      className={styles.fileName}
                      disabled={disabled}
                      onClick={() => onPreview({ ...file, staged })}
                      title={file.path}
                      aria-label={file.path}
                    >
                      <span className={styles.filePath}>
                        <span>{name}</span>
                        {directory && <small>{directory}</small>}
                      </span>
                      {file.staged && file.y !== " " && staged && <small>{t("floatingPartial")}</small>}
                    </button>
                    <code
                      className={conflict ? styles.danger : ""}
                      title={file.y === "?" ? t("floatingUntracked") : group.label}
                    >
                      {conflict ? "U" : staged ? file.x : file.y}
                    </code>
                    {!conflict && (
                      <button
                        type="button"
                        className={styles.groupAction}
                        disabled={disabled}
                        aria-label={`${t(staged ? "floatingUnstageFile" : "floatingStageFile")}: ${file.path}`}
                        title={t(staged ? "floatingUnstageFile" : "floatingStageFile")}
                        onClick={() => onRun({ kind: action, paths: [file.path] })}
                      >
                        {staged ? <Minus size={14} /> : <Plus size={14} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
