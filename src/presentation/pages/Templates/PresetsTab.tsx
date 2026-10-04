import { BookOpen, Check, Pencil, Plus, Settings2, Sparkles, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Select } from "../../components/Select"
import { Switch } from "../../components/Switch"
import { COMMIT_TYPES } from "../../../shared/constants/commit/commitTemplate"
import { newId } from "../../../shared/utils/id"
import { useTranslation } from "../../context"
import type { PresetsTabProps } from "../../../types/components/templates"
import styles from "./style.module.scss"

const COMMIT_TYPE_OPTIONS = COMMIT_TYPES.map((type) => ({
  value: type,
  label: type,
}))

export function PresetsTab({
  presets,
  prefs,
  viewTab,
  docs,
  editingPreset,
  onSelectTemplate,
  onAddPreset,
  onUpdatePreset,
  onEditPreset,
  onCancelEditPreset,
  onDeletePreset,
  onToggleStrict,
  onToggleIcons,
}: PresetsTabProps) {
  const { t } = useTranslation()
  const [newPresetName, setNewPresetName] = useState("")
  const [newPresetType, setNewPresetType] = useState("feat")
  const [newPresetScope, setNewPresetScope] = useState("")

  const showPresets = !viewTab || viewTab === "presets"
  const showPrefs = !viewTab || viewTab === "prefs"

  const templateOptions = (docs ?? []).map((doc) => ({
    value: doc.id,
    label: `${doc.name} (${doc.source === "builtin" ? "Built-in" : ".reflog"})`,
  }))

  useEffect(() => {
    if (editingPreset) {
      setNewPresetName(editingPreset.name)
      setNewPresetType(editingPreset.type)
      setNewPresetScope(editingPreset.scope)
    } else {
      setNewPresetName("")
      setNewPresetType("feat")
      setNewPresetScope("")
    }
  }, [editingPreset])

  const handleSubmit = () => {
    if (!newPresetName.trim()) return
    if (editingPreset && onUpdatePreset) {
      onUpdatePreset({
        ...editingPreset,
        name: newPresetName.trim(),
        type: newPresetType,
        scope: newPresetScope.trim(),
      })
    } else {
      onAddPreset({
        id: newId("preset"),
        name: newPresetName.trim(),
        type: newPresetType,
        scope: newPresetScope.trim(),
        subject: "",
        body: "",
        footer: "",
      })
    }
    setNewPresetName("")
    setNewPresetScope("")
  }

  return (
    <>
      {showPresets && (
        <section className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3>
                <Sparkles size={14} /> {t("commitPresets")}
              </h3>
              <p>{t("commitPresetsHint")}</p>
            </div>
          </div>

          <div className={styles.presetForm}>
            <div className={styles.formField}>
              <label htmlFor="preset-name">{t("presetName")}</label>
              <input
                id="preset-name"
                type="text"
                value={newPresetName}
                placeholder="e.g. Refactor API"
                onChange={(event) => setNewPresetName(event.target.value)}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="preset-type">Type</label>
              <Select
                label="Type"
                value={newPresetType}
                options={COMMIT_TYPE_OPTIONS}
                className={styles.typeSelect}
                buttonClassName={styles.typeSelectBtn}
                onChange={setNewPresetType}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="preset-scope">Scope</label>
              <input
                id="preset-scope"
                type="text"
                value={newPresetScope}
                placeholder="optional"
                onChange={(event) => setNewPresetScope(event.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button type="button" className="primary" disabled={!newPresetName.trim()} onClick={handleSubmit}>
                {editingPreset ? <Check size={14} /> : <Plus size={14} />}
                {editingPreset ? t("presetSave") : t("presetAdd")}
              </button>
              {editingPreset && onCancelEditPreset && (
                <button type="button" className="mini-btn" onClick={onCancelEditPreset}>
                  <X size={14} /> {t("cancel")}
                </button>
              )}
            </div>
          </div>

          {presets.length > 0 && (
            <div className={styles.presetList} style={{ marginTop: 14 }}>
              {presets.map((preset) => (
                <div key={preset.id} className={styles.presetItem}>
                  <div className={styles.presetInfo}>
                    <span className={styles.presetTypeTag}>{preset.type}</span>
                    <strong className={styles.presetName}>{preset.name}</strong>
                    {preset.scope && <span className={styles.presetScope}>({preset.scope})</span>}
                  </div>
                  <div className={styles.presetActions}>
                    {onEditPreset && (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => onEditPreset(preset)}
                        title={t("presetEdit")}
                        aria-label={t("presetEdit")}
                      >
                        <Pencil size={12} />
                        <span>{t("presetEdit")}</span>
                      </button>
                    )}
                    {onDeletePreset && (
                      <button
                        type="button"
                        className="mini-btn danger"
                        onClick={() => onDeletePreset(preset.id)}
                        title={t("presetDelete")}
                        aria-label={t("presetDelete")}
                      >
                        <Trash2 size={12} />
                        <span>{t("presetDelete")}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showPrefs && (
        <section className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3>
                <Settings2 size={14} /> {t("commitPrefsTitle")}
              </h3>
              <p>{t("commitPrefsHint")}</p>
            </div>
          </div>

          {templateOptions.length > 0 && onSelectTemplate && (
            <div className={styles.formField} style={{ marginBottom: 12 }}>
              <label htmlFor="active-template-select">{t("templateActive")}</label>
              <Select
                label={t("templateActive")}
                value={prefs.templateId}
                options={templateOptions}
                className={styles.typeSelect}
                buttonClassName={styles.typeSelectBtn}
                onChange={onSelectTemplate}
              />
            </div>
          )}

          <div className={styles.switchRow}>
            <div className={styles.switchInfo}>
              <strong>{t("commitStrict")}</strong>
              <span>{t("commitStrictHint")}</span>
            </div>
            <Switch checked={prefs.strict} onChange={onToggleStrict} ariaLabel={t("commitStrict")} />
          </div>

          <div className={styles.switchRow}>
            <div className={styles.switchInfo}>
              <strong>{t("commitEmoji")}</strong>
              <span>{t("commitEmojiHint")}</span>
            </div>
            <Switch checked={prefs.useIcons} onChange={onToggleIcons} ariaLabel={t("commitEmoji")} />
          </div>

          <div className={styles.rulesGuide}>
            <h4>
              <BookOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Conventional Commits
            </h4>
            <p>
              <code>type(scope): subject</code>
            </p>
            <div className={styles.rulesList}>
              <div>
                <strong>feat:</strong> {t("conventionalFeat")}
              </div>
              <div>
                <strong>fix:</strong> {t("conventionalFix")}
              </div>
              <div>
                <strong>docs:</strong> {t("conventionalDocs")}
              </div>
              <div>
                <strong>refactor:</strong> {t("conventionalRefactor")}
              </div>
              <div>
                <strong>perf:</strong> {t("conventionalPerf")}
              </div>
              <div>
                <strong>test:</strong> {t("conventionalTest")}
              </div>
              <div>
                <strong>chore:</strong> {t("conventionalChore")}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
