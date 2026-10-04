import { Copy, FileText, Save, Trash2 } from "lucide-react"
import { Select } from "../../Select"
import { Switch } from "../../Switch"
import { COMMIT_TYPES } from "../../../../shared/constants/commit/commitTemplate"
import { useTranslation } from "../../../context"
import type { TemplateEditorProps } from "../../../../types/components/templates"
import { TEMPLATE_VARIABLES } from "../../../pages/Templates/types"
import styles from "./style.module.scss"

const COMMIT_TYPE_OPTIONS = COMMIT_TYPES.map((type) => ({
  value: type,
  label: type,
}))

export function TemplateEditor({
  draft,
  isActive,
  canDelete,
  livePreview,
  textareaRef,
  onDraftChange,
  onToggleActive,
  onDuplicate,
  onDeleteRequest,
  onSave,
  onInsertVariable,
}: TemplateEditorProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className={styles.editorHeader}>
        <div className={styles.editorHeaderTitle}>
          <h2>{draft.name || t("template")}</h2>
          <span className={styles.sourceBadge}>{draft.source === "builtin" ? "Built-in" : "Repo Markdown"}</span>
          <Switch size="sm" checked={isActive} onChange={onToggleActive} label={t("templateActive")} />
        </div>

        <div className={styles.editorHeaderActions}>
          <button type="button" className="mini-btn" onClick={onDuplicate}>
            <Copy size={12} /> {t("templateDuplicate")}
          </button>

          {canDelete && (
            <button type="button" className="mini-btn danger-t" onClick={onDeleteRequest}>
              <Trash2 size={12} /> {t("templateDelete")}
            </button>
          )}

          <button type="button" className="primary" onClick={onSave}>
            <Save size={14} /> {t("saveBtn")}
          </button>
        </div>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.cardHeader}>
          <div>
            <h3>
              <FileText size={14} /> {t("template")}
            </h3>
            <p>{t("templateFolderHint")}</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="tpl-name">{t("templateName")}</label>
            <input
              id="tpl-name"
              type="text"
              value={draft.name}
              placeholder={t("templateNameHint")}
              disabled={draft.source === "builtin"}
              onChange={(event) => onDraftChange((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="tpl-type">Default Type</label>
            <Select
              label="Default Type"
              value={draft.defaults.type}
              options={[{ value: "", label: "(none)" }, ...COMMIT_TYPE_OPTIONS]}
              className={styles.typeSelect}
              buttonClassName={styles.typeSelectBtn}
              onChange={(typeVal) =>
                onDraftChange((prev) => ({
                  ...prev,
                  defaults: { ...prev.defaults, type: typeVal },
                }))
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="tpl-scope">Default Scope</label>
            <input
              id="tpl-scope"
              type="text"
              value={draft.defaults.scope}
              placeholder="e.g. core, auth"
              onChange={(event) =>
                onDraftChange((prev) => ({
                  ...prev,
                  defaults: { ...prev.defaults, scope: event.target.value },
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className={styles.varsToolbar}>
        <div className={styles.varsHeader}>
          <strong>{t("templateVariables")}</strong>
          <span>{t("templateVariableHint")}</span>
        </div>
        <div className={styles.varsChips}>
          {TEMPLATE_VARIABLES.map((variable) => (
            <button
              key={variable.token}
              type="button"
              className={styles.varChip}
              title={variable.token}
              onClick={() => onInsertVariable(variable.token)}
            >
              {variable.label}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.patternSplit}>
        <div className={styles.editorPane}>
          <div className={styles.paneHeader}>
            <span>{t("templatePattern")}</span>
            <small>{t("templatePatternHint")}</small>
          </div>
          <textarea
            ref={textareaRef}
            className={styles.patternTextarea}
            value={draft.pattern}
            placeholder={t("templatePatternPlaceholder")}
            aria-label={t("templatePattern")}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, pattern: event.target.value }))}
          />
        </div>

        <div className={styles.previewPane}>
          <div className={styles.paneHeader}>
            <span>{t("templatePreview")}</span>
          </div>
          <div className={styles.previewBox}>
            {livePreview ? (
              <pre className={styles.previewText}>{livePreview}</pre>
            ) : (
              <div className={styles.previewEmpty}>
                <span>{t("templatePreviewEmpty")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
