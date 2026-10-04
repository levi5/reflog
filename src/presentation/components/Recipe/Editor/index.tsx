import { Bot, Save, Trash2 } from "lucide-react"
import type {
  AutomationRecipe,
  AutomationShortcut,
  AutomationStep,
} from "../../../../domain/entities/automations/automations"
import { Switch } from "../../Switch"
import { useTranslation } from "../../../context"
import { StepList } from "./StepEditor"
import styles from "./style.module.scss"

interface RecipeEditorHeaderProps {
  draftRecipe: AutomationRecipe
  currentRepoPath: string
  onTransformDraftRecipe: (transformRecipe: (draftRecipe: AutomationRecipe) => AutomationRecipe) => void
  onPickRepository: () => void
  recipeAction?: AutomationShortcut | null
  onToggleRecipeAction: (checked: boolean) => void
}

function RecipeEditorHeader({
  draftRecipe,
  currentRepoPath,
  onTransformDraftRecipe,
  onPickRepository,
  recipeAction,
  onToggleRecipeAction,
}: RecipeEditorHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.editorHeader}>
      <input
        className={styles.titleInput}
        value={draftRecipe.name}
        placeholder={t("recipeName")}
        aria-label={t("recipeName")}
        onChange={(changeEvent) =>
          onTransformDraftRecipe((previousRecipe) => ({
            ...previousRecipe,
            name: changeEvent.target.value,
          }))
        }
      />
      <input
        value={draftRecipe.description}
        placeholder={t("recipeDesc")}
        aria-label={t("recipeDesc")}
        onChange={(changeEvent) =>
          onTransformDraftRecipe((previousRecipe) => ({
            ...previousRecipe,
            description: changeEvent.target.value,
          }))
        }
      />
      <div className={styles.repositoryTarget}>
        <label>
          {t("targetRepository")}
          <input
            value={draftRecipe.repoPath}
            placeholder={currentRepoPath}
            onChange={(changeEvent) =>
              onTransformDraftRecipe((previousRecipe) => ({
                ...previousRecipe,
                repoPath: changeEvent.target.value,
              }))
            }
          />
        </label>
        <button type="button" className="mini-btn" onClick={onPickRepository}>
          {t("chooseRepository")}
        </button>
      </div>
      {recipeAction !== undefined ? (
        <Switch
          checked={Boolean(recipeAction)}
          disabled={!draftRecipe.name.trim()}
          onChange={(checked) => onToggleRecipeAction(checked)}
          label={t("addQuickAction")}
        />
      ) : null}
    </div>
  )
}

interface RecipeEditorFooterProps {
  canSave: boolean
  onSaveDraft: () => void
  onDeleteDraft: () => void
}

function RecipeEditorFooter({ canSave, onSaveDraft, onDeleteDraft }: RecipeEditorFooterProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.editorFoot}>
      <button type="button" className="mini-btn" disabled={!canSave} onClick={onSaveDraft}>
        <Save size={12} /> {t("saveRecipe")}
      </button>
      <button type="button" className="mini-btn danger" title={t("deleteRecipe")} onClick={onDeleteDraft}>
        <Trash2 size={12} />
        {t("remove")}
      </button>
    </div>
  )
}

function RecipeWelcomePanel() {
  const { t } = useTranslation()
  return (
    <div className={styles.welcome}>
      <Bot size={32} />
      <h3>{t("selectOrCreateRecipe")}</h3>
      <p>{t("automationsHint")}</p>
    </div>
  )
}

export interface RecipeEditorProps {
  draftRecipe: AutomationRecipe | null
  selectedRecipe: AutomationRecipe | null
  currentRepoPath: string
  onTransformDraftRecipe: (transformRecipe: (draftRecipe: AutomationRecipe) => AutomationRecipe) => void
  onPickRepository: () => void
  onAddStep: () => void
  onTransformStep: (stepId: string, transformStep: (automationStep: AutomationStep) => AutomationStep) => void
  onRemoveStep: (stepId: string) => void
  onSaveDraft: () => void
  onDeleteDraft: () => void
  recipeAction: AutomationShortcut | null
  onToggleRecipeAction: (checked: boolean) => void
}

export function RecipeEditor({
  draftRecipe,
  selectedRecipe,
  currentRepoPath,
  onTransformDraftRecipe,
  onPickRepository,
  onAddStep,
  onTransformStep,
  onRemoveStep,
  onSaveDraft,
  onDeleteDraft,
  recipeAction,
  onToggleRecipeAction,
}: RecipeEditorProps) {
  if (!draftRecipe || !selectedRecipe) {
    return (
      <div className={styles.editor}>
        <RecipeWelcomePanel />
      </div>
    )
  }

  return (
    <div className={styles.editor}>
      <RecipeEditorHeader
        draftRecipe={draftRecipe}
        currentRepoPath={currentRepoPath}
        onTransformDraftRecipe={onTransformDraftRecipe}
        onPickRepository={onPickRepository}
        recipeAction={recipeAction}
        onToggleRecipeAction={onToggleRecipeAction}
      />
      <StepList
        draftRecipe={draftRecipe}
        onAddStep={onAddStep}
        onTransformStep={onTransformStep}
        onRemoveStep={onRemoveStep}
      />
      <RecipeEditorFooter
        canSave={Boolean(draftRecipe.name.trim())}
        onSaveDraft={onSaveDraft}
        onDeleteDraft={onDeleteDraft}
      />
    </div>
  )
}
