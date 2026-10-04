import classnames from "classnames"
import { TemplateList } from "../List"
import { Tabs } from "../../Tabs"

import type { TemplateSidebarProps, ViewTab } from "@/types/components"
import { useTranslation } from "../../../context"
import { PresetList } from "../Preset"

import styles from "./style.module.scss"

export function TemplateSidebar({
  docs,
  selectedId,
  prefs,
  presets,
  viewTab,
  page,
  onSetViewTab,
  onSetPage,
  onSelectDoc,
  onCreateNew,
  onDeleteTemplate,
  onDeletePreset,
  onEditPreset,
}: TemplateSidebarProps) {
  const { t } = useTranslation()
  const activeDocName = docs.find((doc) => doc.id === prefs.templateId)?.name ?? "conventional"

  return (
    <aside className={styles.list}>
      <Tabs<ViewTab>
        value={viewTab}
        onChange={onSetViewTab}
        items={[
          { id: "templates", label: t("template") },
          { id: "presets", label: t("commitPresets") },
          { id: "prefs", label: t("commitPrefsTitle") },
        ]}
        variant="segmented"
        size="sm"
        fullWidth
        className={styles.tabsRoot}
        ariaLabel="Template tabs"
      />

      {viewTab === "templates" && (
        <TemplateList
          docs={docs}
          selectedId={selectedId}
          prefs={prefs}
          currentPage={page}
          onPageChange={onSetPage}
          onSelectDoc={onSelectDoc}
          onCreateNew={onCreateNew}
          onDeleteTemplate={onDeleteTemplate}
        />
      )}

      {viewTab === "presets" && (
        <PresetList presets={presets} onDeletePreset={onDeletePreset} onEditPreset={onEditPreset} />
      )}

      {viewTab === "prefs" && (
        <div className={styles.prefsSummary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t("templateActive")}</span>
            <strong className={styles.summaryValue}>{activeDocName}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t("commitStrict")}</span>
            <span className={classnames(styles.summaryBadge, prefs.strict ? styles.badgeOn : styles.badgeOff)}>
              {prefs.strict ? "ON" : "OFF"}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t("commitEmoji")}</span>
            <span className={classnames(styles.summaryBadge, prefs.useIcons ? styles.badgeOn : styles.badgeOff)}>
              {prefs.useIcons ? "ON" : "OFF"}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{t("commitPresets")}</span>
            <strong className={styles.summaryValue}>{presets.length}</strong>
          </div>
          <div className={styles.hintCard}>
            <small>{t("commitPrefsHint")}</small>
          </div>
        </div>
      )}
    </aside>
  )
}

export const Sidebar = TemplateSidebar
