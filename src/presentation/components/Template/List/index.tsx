import classnames from "classnames"
import { Check, FileCode, Sparkles, Trash2 } from "lucide-react"

import { List } from "../../List"

import type { TemplateDoc, CommitPrefs } from "@/domain/entities"

import styles from "./style.module.scss"
import { useTranslation } from "@/presentation/context"

const TEMPLATES_PER_PAGE = 10

interface TemplateListProps {
  docs: TemplateDoc[]
  selectedId: string | null
  prefs: CommitPrefs
  _lang?: string
  currentPage: number
  onPageChange: (page: number) => void
  onSelectDoc: (doc: TemplateDoc) => void
  onCreateNew: () => void
  onLoadExample: () => void
  onDeleteTemplate?: (doc: TemplateDoc) => void
}

export function TemplateList({
  docs,
  selectedId,
  prefs,
  currentPage,
  onPageChange,
  onSelectDoc,
  onCreateNew,
  onLoadExample,
  onDeleteTemplate,
}: TemplateListProps) {
  const { t } = useTranslation()

  const header = (
    <div className={styles.listHead}>
      <strong>{t("templateTitle")}</strong>
      <div className={styles.listActions}>
        <button type="button" className="mini-btn" title={t("templatePreview")} onClick={onLoadExample}>
          <Sparkles size={12} />
        </button>
        <button type="button" className="mini-btn" onClick={onCreateNew}>
          <FileCode size={12} /> {t("templateNew")}
        </button>
      </div>
    </div>
  )

  const emptyState = <p className={styles.emptyHint}>{t("templateEmpty")}</p>

  const renderItem = (
    doc: TemplateDoc,
    _isSelected: boolean,
    _actions: Array<{ onClick: () => void; icon?: React.ReactNode; disabled?: boolean; ariaLabel?: string }>,
  ) => {
    const isActive = prefs.templateId === doc.id
    const hasActions = doc.source === "repo" && Boolean(onDeleteTemplate)

    return (
      <>
        <div className={styles.itemContent}>
          <div className={styles.templateIcon}>
            {doc.source === "builtin" ? <Sparkles size={15} /> : <FileCode size={15} />}
          </div>
          <div className={styles.templateMeta}>
            <strong>{doc.name}</strong>
            <small>
              <span className={styles.sourceBadge}>{doc.source === "builtin" ? "Built-in" : ".reflog"}</span>
              {doc.defaults.type && <span>{doc.defaults.type}</span>}
            </small>
          </div>
          {isActive && (
            <span className={styles.activeBadge}>
              <Check size={10} /> {t("templateActive")}
            </span>
          )}
        </div>
        {hasActions && (
          <div className={styles.itemActions}>
            <button
              type="button"
              className={classnames(styles.actionBtn, styles.danger)}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteTemplate?.(doc)
              }}
              aria-label={t("templateDelete")}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <List.Virtual<TemplateDoc>
      items={docs}
      selectedId={selectedId}
      currentPage={currentPage}
      pageSize={TEMPLATES_PER_PAGE}
      onPageChange={onPageChange}
      onSelect={(id) => {
        const doc = docs.find((d) => d.id === id)
        if (doc) onSelectDoc(doc)
      }}
      onAction={(id, action) => {
        if (action === "delete") {
          const doc = docs.find((d) => d.id === id)
          if (doc && onDeleteTemplate) onDeleteTemplate(doc)
        }
      }}
      isRunning={false}
      getItemId={(doc) => doc.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      itemClassName={styles.listItem}
      listClassName={styles.virtualListWrapper}
    />
  )
}
