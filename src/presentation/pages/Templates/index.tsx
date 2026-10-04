import { Check } from "lucide-react"
import { Dialog } from "../../components/Dialog"
import { TemplateEditor } from "../../components/Editor/Template"
import { TemplateCreateDialog } from "../../components/Template/CreateDialog"
import { TemplateSidebar } from "../../components/Template/SideBar"
import { EmptyState } from "../../components/Empty/State"
import { useRepoCore, useTranslation } from "../../context"
import { useTemplateManager } from "../../hooks/commit/useTemplateManager"
import { PresetsTab } from "./PresetsTab"

import styles from "./style.module.scss"

export function Templates() {
  const { t } = useTranslation()
  const repo = useRepoCore()
  const repoPath = repo.repo

  const {
    viewTab,
    setViewTab,
    docs,
    repoDocs,
    canDeleteDraft,
    selectedId,
    draft,
    setDraft,
    prefs,
    presets,
    page,
    setPage,
    feedback,
    createOpen,
    setCreateOpen,
    deleteOpen,
    setDeleteOpen,
    templateToDelete,
    textareaRef,
    livePreview,
    handleSelectDoc,
    handleOpenCreate,
    handleStartCreate,
    handleDuplicate,
    handleSaveTemplate,
    handleRequestDeleteTemplate,
    handleDeleteTemplate,
    handleToggleActiveTemplate,
    handleSetActiveTemplate,
    handleToggleStrict,
    handleToggleIcons,
    handleInsertVariable,
    editingPreset,
    handleStartEditPreset,
    handleCancelEditPreset,
    handleUpdatePreset,
    handleAddPreset,
    handleDeletePreset,
  } = useTemplateManager({ repoPath })

  if (!repoPath) {
    return <EmptyState message={t("noRepo")} />
  }

  return (
    <div className={styles.layout}>
      <TemplateSidebar
        docs={repoDocs}
        selectedId={selectedId}
        prefs={prefs}
        presets={presets}
        viewTab={viewTab}
        page={page}
        onSetViewTab={setViewTab}
        onSetPage={setPage}
        onSelectDoc={handleSelectDoc}
        onCreateNew={handleOpenCreate}
        onDeleteTemplate={handleRequestDeleteTemplate}
        onDeletePreset={handleDeletePreset}
        onEditPreset={handleStartEditPreset}
      />

      <div className={styles.editor}>
        {feedback && (
          <div className={styles.bannerSuccess}>
            <Check size={14} /> {feedback}
          </div>
        )}

        {viewTab === "templates" &&
          (draft ? (
            <TemplateEditor
              draft={draft}
              isActive={prefs.templateId === draft.id}
              canDelete={canDeleteDraft}
              livePreview={livePreview}
              textareaRef={textareaRef}
              onDraftChange={(updater) => setDraft((prev) => (prev ? updater(prev) : prev))}
              onToggleActive={handleToggleActiveTemplate}
              onDuplicate={handleDuplicate}
              onDeleteRequest={() => handleRequestDeleteTemplate(draft)}
              onSave={handleSaveTemplate}
              onInsertVariable={handleInsertVariable}
            />
          ) : (
            <div className={styles.pickTemplate}>
              <h3>{t("templateTitle")}</h3>
              <p>{t("templatePickHint")}</p>
            </div>
          ))}

        {(viewTab === "presets" || viewTab === "prefs") && (
          <PresetsTab
            presets={presets}
            prefs={prefs}
            viewTab={viewTab}
            docs={docs}
            editingPreset={editingPreset}
            onSelectTemplate={handleSetActiveTemplate}
            onAddPreset={handleAddPreset}
            onUpdatePreset={handleUpdatePreset}
            onEditPreset={handleStartEditPreset}
            onCancelEditPreset={handleCancelEditPreset}
            onDeletePreset={handleDeletePreset}
            onToggleStrict={handleToggleStrict}
            onToggleIcons={handleToggleIcons}
          />
        )}
      </div>

      <TemplateCreateDialog open={createOpen} onCancel={() => setCreateOpen(false)} onSelect={handleStartCreate} />

      <Dialog.Confirm
        open={deleteOpen}
        title={t("templateDelete")}
        confirmLabel={t("templateDelete")}
        cancelLabel={t("cancel")}
        danger={true}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteTemplate}
      >
        <p>
          {t("confirmDeleteTemplate")} ({templateToDelete?.name ?? draft?.name})
        </p>
      </Dialog.Confirm>
    </div>
  )
}
