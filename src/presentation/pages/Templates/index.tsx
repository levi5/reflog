import { Check } from "lucide-react"
import { Dialog } from "../../components/Dialog"
import { TemplateEditor } from "../../components/Editor/Template"
import { TemplateSidebar } from "../../components/Template/SideBar"
import { EmptyState } from "../../components/Empty/State"
import { useRepo, useTranslation } from "../../context"
import { useTemplateManager } from "../../hooks/commit/useTemplateManager"
import { PresetsTab } from "./PresetsTab"

import styles from "./style.module.scss"

export function Templates() {
  const { t } = useTranslation()
  const repo = useRepo()
  const repoPath = repo.repo

  const {
    viewTab,
    setViewTab,
    docs,
    selectedId,
    draft,
    setDraft,
    prefs,
    presets,
    page,
    setPage,
    feedback,
    deleteOpen,
    setDeleteOpen,
    templateToDelete,
    textareaRef,
    livePreview,
    handleSelectDoc,
    handleCreateNew,
    handleLoadExample,
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
        docs={docs}
        selectedId={selectedId}
        prefs={prefs}
        presets={presets}
        viewTab={viewTab}
        page={page}
        onSetViewTab={setViewTab}
        onSetPage={setPage}
        onSelectDoc={handleSelectDoc}
        onCreateNew={handleCreateNew}
        onLoadExample={handleLoadExample}
        onDeleteTemplate={handleRequestDeleteTemplate}
        onDeletePreset={handleDeletePreset}
        onEditPreset={handleStartEditPreset}
      />

      <main className={styles.editor}>
        {feedback && (
          <div className={styles.bannerSuccess}>
            <Check size={14} /> {feedback}
          </div>
        )}

        {viewTab === "templates" && draft && (
          <TemplateEditor
            draft={draft}
            isActive={prefs.templateId === draft.id}
            livePreview={livePreview}
            textareaRef={textareaRef}
            onDraftChange={(updater) => setDraft((prev) => (prev ? updater(prev) : prev))}
            onToggleActive={handleToggleActiveTemplate}
            onDuplicate={handleDuplicate}
            onDeleteRequest={() => handleRequestDeleteTemplate(draft)}
            onSave={handleSaveTemplate}
            onInsertVariable={handleInsertVariable}
          />
        )}

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
      </main>

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
