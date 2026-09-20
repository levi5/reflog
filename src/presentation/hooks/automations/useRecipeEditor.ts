import { useState } from "react"
import type {
  AutomationRecipe,
  AutomationShortcut,
  AutomationStep,
} from "../../../domain/entities/automations/automations"
import { t } from "../../../i18n"
import { emptyRecipe, emptyStep, newId } from "../../../main/adapters"
import { DEFAULT_QUICK_ACTION_COLOR } from "../../../shared/constants/theme"
import type { Lang } from "../../../types"
import type { useAutomations } from "./useAutomations"

type RecipeStore = Pick<
  ReturnType<typeof useAutomations>,
  "recipes" | "shortcuts" | "saveRecipe" | "deleteRecipe" | "saveShortcut" | "deleteShortcut"
>

interface EditorOptions {
  lang: Lang
  currentRepoPath: string
  automations: RecipeStore
  onSelectionChange: () => void
}

function exampleRecipe(lang: Lang, repoPath: string): AutomationRecipe {
  return {
    id: newId("recipe"),
    name: t(lang, "repositorySummary"),
    description: t(lang, "recipeSummaryDescription"),
    repoPath,
    variables: [],
    steps: [
      {
        id: newId("step"),
        when: null,
        run: { command: "status --short", target: "repo" },
      },
      {
        id: newId("step"),
        when: null,
        run: { command: "branch --show-current", target: "repo" },
      },
      {
        id: newId("step"),
        when: null,
        run: { command: "log --oneline -5", target: "repo" },
      },
    ],
  }
}

function createBlankStep(): AutomationStep {
  return { ...emptyStep(), run: { command: "", target: "repo" } }
}

export function useRecipeEditor({ lang, currentRepoPath, automations, onSelectionChange }: EditorOptions) {
  const [draftRecipe, setDraftRecipe] = useState<AutomationRecipe | null>(null)
  const selectedRecipeId = draftRecipe?.id ?? null
  const recipeAction =
    automations.shortcuts.find(
      (shortcut) => shortcut.targetType === "recipe" && shortcut.targetId === draftRecipe?.id,
    ) ?? null

  const selectedRecipe = selectedRecipeId
    ? (automations.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null)
    : null

  const selectRecipe = (recipe: AutomationRecipe | null) => {
    setDraftRecipe(recipe ? structuredClone(recipe) : null)
    onSelectionChange()
  }

  const openRecipe = (recipeId: string) => {
    selectRecipe(automations.recipes.find((recipe) => recipe.id === recipeId) ?? null)
  }

  const createRecipe = () => {
    const recipe = emptyRecipe()
    recipe.name = t(lang, "newRecipe")
    recipe.repoPath = currentRepoPath
    automations.saveRecipe(recipe)
    selectRecipe(recipe)
  }

  const transformDraftRecipe = (transformRecipe: (draftRecipe: AutomationRecipe) => AutomationRecipe) => {
    setDraftRecipe((previousDraft) => (previousDraft ? transformRecipe(previousDraft) : previousDraft))
  }

  const transformDraftStep = (stepId: string, transformStep: (automationStep: AutomationStep) => AutomationStep) => {
    transformDraftRecipe((previousRecipe) => ({
      ...previousRecipe,
      steps: previousRecipe.steps.map((automationStep) =>
        automationStep.id === stepId ? transformStep(automationStep) : automationStep,
      ),
    }))
  }

  const addBlankStep = () => {
    transformDraftRecipe((previousRecipe) => ({
      ...previousRecipe,
      steps: [...previousRecipe.steps, createBlankStep()],
    }))
  }

  const removeDraftStep = (stepId: string) => {
    transformDraftRecipe((previousRecipe) => ({
      ...previousRecipe,
      steps: previousRecipe.steps.filter((automationStep) => automationStep.id !== stepId),
    }))
  }

  const deleteRecipeAndClearSelection = (recipeId: string) => {
    automations.deleteRecipe(recipeId)
    if (selectedRecipeId !== recipeId) return
    selectRecipe(null)
  }

  const loadExampleRecipe = () => {
    const recipe = exampleRecipe(lang, currentRepoPath)
    automations.saveRecipe(recipe)
    selectRecipe(recipe)
  }

  const saveDraftRecipe = () => {
    if (!draftRecipe) return
    if (!draftRecipe.name.trim()) return
    automations.saveRecipe(draftRecipe)
  }

  const toggleRecipeAction = (checked: boolean) => {
    if (checked && draftRecipe) {
      automations.saveRecipe(draftRecipe)
      const shortcut: AutomationShortcut = {
        id: newId("shortcut"),
        targetType: "recipe",
        targetId: draftRecipe.id,
        color: DEFAULT_QUICK_ACTION_COLOR,
      }
      automations.saveShortcut(shortcut)
    } else if (!checked && recipeAction) {
      automations.deleteShortcut(recipeAction.id)
    }
  }

  return {
    draftRecipe,
    selectedRecipeId,
    selectedRecipe,
    recipeAction,
    selectRecipe,
    openRecipe,
    createRecipe,
    loadExampleRecipe,
    transformDraftRecipe,
    transformDraftStep,
    addBlankStep,
    removeDraftStep,
    deleteRecipeAndClearSelection,
    saveDraftRecipe,
    toggleRecipeAction,
  }
}
