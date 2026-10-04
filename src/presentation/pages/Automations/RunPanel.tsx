import { automationsUseCase } from "../../../data"
import { Play } from "lucide-react"
import type {
  AutomationAlias,
  AutomationLogLine,
  AutomationRecipe,
} from "../../../domain/entities/automations/automations"
import { VariablesEditor, RunLogList } from "../../components/Automations"
import { PreviewList, ReviewModal } from "../../components/Recipe"
import { useTranslation } from "../../context"
import styles from "./style.module.scss"

interface RunPanelProps {
  draftRecipe: AutomationRecipe
  aliases: AutomationAlias[]
  variableValues: Record<string, string>
  onVariableValuesChange: (values: Record<string, string>) => void
  isRunning: boolean
  onRequestRun: () => void
}

function RunPanel({
  draftRecipe,
  aliases,
  variableValues,
  onVariableValuesChange,
  isRunning,
  onRequestRun,
}: RunPanelProps) {
  const { t } = useTranslation()
  const variableNames = automationsUseCase.extractRecipeVariables(draftRecipe)
  const isRunDisabled = isRunning || draftRecipe.steps.length === 0
  return (
    <div className={styles.runPanel}>
      <VariablesEditor
        variableNames={variableNames}
        variableValues={variableValues}
        onVariableValuesChange={onVariableValuesChange}
      />
      <button type="button" className="primary" disabled={isRunDisabled} onClick={onRequestRun}>
        <Play size={13} /> {t("runRecipe")}
      </button>
      <PreviewList draftRecipe={draftRecipe} aliases={aliases} variableValues={variableValues} />
    </div>
  )
}

interface RunSidebarProps {
  draftRecipe: AutomationRecipe | null
  selectedRecipe: AutomationRecipe | null
  aliases: AutomationAlias[]
  variableValues: Record<string, string>
  onVariableValuesChange: (values: Record<string, string>) => void
  isRunning: boolean
  logLines: AutomationLogLine[]
  currentRepoPath: string
  isReviewOpen: boolean
  onRequestRun: () => void
  onCloseReview: () => void
  onConfirmReview: () => void
}

export function RunSidebar({
  draftRecipe,
  selectedRecipe,
  aliases,
  variableValues,
  onVariableValuesChange,
  isRunning,
  logLines,
  currentRepoPath,
  isReviewOpen,
  onRequestRun,
  onCloseReview,
  onConfirmReview,
}: RunSidebarProps) {
  const { t } = useTranslation()
  const canShowRunPanel = draftRecipe !== null && selectedRecipe !== null
  return (
    <aside className={styles.run}>
      <div className={styles.runHead}>
        <strong>{t("previewRun")}</strong>
      </div>
      {canShowRunPanel && draftRecipe ? (
        <RunPanel
          draftRecipe={draftRecipe}
          aliases={aliases}
          variableValues={variableValues}
          onVariableValuesChange={onVariableValuesChange}
          isRunning={isRunning}
          onRequestRun={onRequestRun}
        />
      ) : (
        <p className={styles.hint}>{t("selectRecipeToRun")}</p>
      )}
      <RunLogList logLines={logLines} draftRepoPath={draftRecipe?.repoPath} currentRepoPath={currentRepoPath} />
      {draftRecipe && (
        <ReviewModal
          isOpen={isReviewOpen}
          draftRecipe={draftRecipe}
          aliases={aliases}
          variableValues={variableValues}
          onClose={onCloseReview}
          onConfirm={onConfirmReview}
        />
      )}
    </aside>
  )
}
