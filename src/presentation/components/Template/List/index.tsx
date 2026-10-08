import { Check, FileCode, Sparkles, Trash2 } from "lucide-react"

import { List } from "../../List"

import type { TemplateDoc, CommitPrefs } from "@/domain/entities"

import styles from "./style.module.scss"
import { useTranslation } from "@/presentation/context"
import { IconActionButton } from "../../Button"

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
  onDeleteTemplate,
}: TemplateListProps) {
  const { t } = useTranslation()

  const header = (
    <div className={styles.listHead}>
      <strong>{t("templateTitle")}</strong>
      <div className={styles.listActions}>
        <button type="button" className="mini-btn" onClick={onCreateNew}>
          <FileCode size={12} /> {t("templateNew")}
        </button>
      </div>
    </div>
  )

  const emptyState = <p className={styles.emptyHint}>{t("templateEmpty")}</p>

  const renderItem = (doc: TemplateDoc) => {
    const isActive = prefs.templateId === doc.id
    const hasActions = doc.source === "repo" && Boolean(onDeleteTemplate)

    return (
      <>
        <button type="button" className={styles.itemContent} onClick={() => onSelectDoc(doc)}>
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
        </button>
        {hasActions && (
          <div className={styles.itemActions}>
            <IconActionButton
              icon={<Trash2 size={15} />}
              tone="danger"
              onClick={() => onDeleteTemplate?.(doc)}
              label={t("templateDelete")}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <List.Paged<TemplateDoc>
      items={docs}
      selectedId={selectedId}
      currentPage={currentPage}
      pageSize={TEMPLATES_PER_PAGE}
      onPageChange={onPageChange}
      getItemId={(doc) => doc.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      itemClassName={styles.listItem}
      listClassName={styles.virtualListWrapper}
    />
  )
}
