import type { RefObject } from "react"
import classnames from "classnames"
import type { AutomationRecipe } from "../../../../domain/entities/automations/automations"
import { RecipeList } from "../List"
import { Tool } from "../../Tool"
import styles from "./style.module.scss"

export interface RecipeSidebarProps {
  recipes: AutomationRecipe[]
  selectedRecipeId: string | null
  importErrorMessage: string
  fileInputRef: RefObject<HTMLInputElement | null>
  onOpenRecipe: (recipeId: string) => void
  onCreateRecipe: () => void
  onLoadExample: () => void
  onDeleteRecipe: (recipeId: string) => void
  onRunRecipe: (recipe: AutomationRecipe) => void
  isRunning: boolean
  currentPage: number
  onPageChange: (page: number) => void
  onExportRecipes: () => void
  onImportFile: (importFile: File) => void
  className?: string
}

export function RecipeSidebar({
  recipes,
  selectedRecipeId,
  importErrorMessage,
  fileInputRef,
  onOpenRecipe,
  onCreateRecipe,
  onLoadExample,
  onDeleteRecipe,
  onRunRecipe,
  isRunning,
  currentPage,
  onPageChange,
  onExportRecipes,
  onImportFile,
  className,
}: RecipeSidebarProps) {
  return (
    <aside className={classnames(styles.sidebar, className)}>
      <RecipeList
        recipes={recipes}
        selectedRecipeId={selectedRecipeId}
        onOpenRecipe={onOpenRecipe}
        onCreateRecipe={onCreateRecipe}
        onLoadExample={onLoadExample}
        onDeleteRecipe={onDeleteRecipe}
        onRunRecipe={onRunRecipe}
        isRunning={isRunning}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <div className={styles.tools}>
        <div className={styles.toolsRow}>
          <Tool.Export onExport={onExportRecipes} />
          <Tool.Import fileInputRef={fileInputRef} onImportFile={onImportFile} />
        </div>
        {importErrorMessage && <p className={styles.error}>{importErrorMessage}</p>}
      </div>
    </aside>
  )
}
