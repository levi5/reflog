import { useRef, useState } from "react"
import { t } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import { EmptyState } from "../../components/Empty/State"
import { Recipe } from "../../components/Recipe"
import { useRepo, useSettingsContext } from "../../context"
import { useAutomations } from "../../hooks"
import { useAutomationTransfer } from "../../hooks/automations/useAutomationTransfer"
import { useRecipeEditor } from "../../hooks/automations/useRecipeEditor"
import { RunSidebar } from "./RunPanel"
import styles from "./style.module.scss"

export function Automations() {
  const { lang } = useSettingsContext()
  const repository = useRepo()
  const currentRepoPath = repository.repo
  const automations = useAutomations({
    repoRoot: currentRepoPath,
    submodulePaths: [],
    refreshRepo: () => repository.refresh(repository.repo),
  })
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [recipePage, setRecipePage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useRecipeEditor({
    lang,
    currentRepoPath,
    automations,
    onSelectionChange: () => {
      setVariableValues({})
      setIsReviewOpen(false)
    },
  })
  const { draftRecipe, selectedRecipe, selectedRecipeId } = editor
  const { exportAutomations, importAutomationsFromFile } = useAutomationTransfer({
    lang,
    automations,
    selectedRecipeId,
    onSelectRecipe: editor.selectRecipe,
    setFeedbackMessage,
  })

  const pickRepositoryPath = async (): Promise<string | null> => {
    const pickedPath = await repository.pickDir()
    if (!pickedPath) return null
    const isValidRepo = await gitApi.checkRepo(pickedPath)
    if (!isValidRepo) {
      setFeedbackMessage(t(lang, "invalidRepository"))
      return null
    }
    return gitApi.repoRoot(pickedPath)
  }

  const handlePickRepositoryForDraft = () => {
    void pickRepositoryPath().then((pickedPath) => {
      if (!pickedPath) return
      editor.transformDraftRecipe((previousRecipe) => ({
        ...previousRecipe,
        repoPath: pickedPath,
      }))
    })
  }

  if (!currentRepoPath) {
    return <EmptyState message={t(lang, "noRepo")} />
  }

  return (
    <div className={styles.layout}>
      <Recipe.SideBar
        recipes={automations.recipes}
        selectedRecipeId={selectedRecipeId}
        importErrorMessage={feedbackMessage}
        fileInputRef={fileInputRef}
        onOpenRecipe={editor.openRecipe}
        onCreateRecipe={editor.createRecipe}
        onLoadExample={editor.loadExampleRecipe}
        onDeleteRecipe={editor.deleteRecipeAndClearSelection}
        onRunRecipe={(recipe) => void automations.runRecipe(recipe, {})}
        isRunning={automations.running}
        currentPage={recipePage}
        onPageChange={setRecipePage}
        onExportRecipes={exportAutomations}
        onImportFile={(importFile) => void importAutomationsFromFile(importFile)}
      />
      <Recipe.Editor
        draftRecipe={draftRecipe}
        selectedRecipe={selectedRecipe}
        currentRepoPath={currentRepoPath}
        onTransformDraftRecipe={editor.transformDraftRecipe}
        onPickRepository={handlePickRepositoryForDraft}
        onAddStep={editor.addBlankStep}
        onTransformStep={editor.transformDraftStep}
        onRemoveStep={editor.removeDraftStep}
        onSaveDraft={editor.saveDraftRecipe}
        onDeleteDraft={() => {
          if (draftRecipe) editor.deleteRecipeAndClearSelection(draftRecipe.id)
        }}
        recipeAction={editor.recipeAction}
        onToggleRecipeAction={editor.toggleRecipeAction}
      />
      <RunSidebar
        draftRecipe={draftRecipe}
        selectedRecipe={selectedRecipe}
        aliases={automations.aliases}
        variableValues={variableValues}
        onVariableValuesChange={setVariableValues}
        isRunning={automations.running}
        logLines={automations.log}
        currentRepoPath={currentRepoPath}
        isReviewOpen={isReviewOpen}
        onRequestRun={() => setIsReviewOpen(true)}
        onCloseReview={() => setIsReviewOpen(false)}
        onConfirmReview={() => {
          setIsReviewOpen(false)
          if (draftRecipe) void automations.runRecipe(draftRecipe, variableValues)
        }}
      />
    </div>
  )
}
