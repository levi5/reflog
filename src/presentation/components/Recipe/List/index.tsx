import { Play, Plus, Trash2, Zap } from "lucide-react"
import type { AutomationRecipe } from "../../../../domain/entities/automations/automations"
import { List } from "../../List"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"
import classnames from "classnames"

const RECIPES_PER_PAGE = 10

export interface RecipeListProps {
  recipes: AutomationRecipe[]
  selectedRecipeId: string | null
  onOpenRecipe: (recipeId: string) => void
  onCreateRecipe: () => void
  onLoadExample: () => void
  onDeleteRecipe: (recipeId: string) => void
  onRunRecipe: (recipe: AutomationRecipe) => void
  isRunning: boolean
  currentPage: number
  onPageChange: (page: number) => void
}

export function RecipeList({
  recipes,
  selectedRecipeId,
  onOpenRecipe,
  onCreateRecipe,
  onLoadExample,
  onDeleteRecipe,
  onRunRecipe,
  isRunning,
  currentPage,
  onPageChange,
}: RecipeListProps) {
  const { t } = useTranslation()

  const header = (
    <div className={styles.listHead}>
      <strong>{t("automations")}</strong>
      <div className={styles.listActions}>
        <button type="button" className="mini-btn" title={t("newRecipe")} onClick={onCreateRecipe}>
          <Plus size={12} />
        </button>
        <button type="button" className="mini-btn" title={t("loadExample")} onClick={onLoadExample}>
          <Zap size={12} />
        </button>
      </div>
    </div>
  )

  const emptyState = (
    <div className={styles.emptyList}>
      <p>{t("noRecipes")}</p>
      <button type="button" className="mini-btn" onClick={onLoadExample}>
        <Play size={12} /> {t("tryExample")}
      </button>
    </div>
  )

  const renderItem = (recipe: AutomationRecipe) => (
    <>
      <div className={styles.itemContent}>
        <span className={styles.recipeName}>{recipe.name}</span>
        <span className={styles.recipeMeta}>
          {recipe.steps.length} {t("steps").toLowerCase()}
        </span>
      </div>
      <div className={styles.itemActions}>
        <button
          type="button"
          className={styles.actionBtn}
          disabled={isRunning || recipe.steps.length === 0}
          onClick={(e) => {
            e.stopPropagation()
            onRunRecipe(recipe)
          }}
          aria-label={t("runRecipe")}
          title={t("runRecipe")}
        >
          <Play size={16} />
        </button>
        <button
          type="button"
          className={classnames(styles.actionBtn, styles.danger)}
          onClick={(e) => {
            e.stopPropagation()
            onDeleteRecipe(recipe.id)
          }}
          aria-label={t("deleteRecipe")}
          title={t("deleteRecipe")}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </>
  )

  return (
    <List.Virtual<AutomationRecipe>
      items={recipes}
      selectedId={selectedRecipeId}
      currentPage={currentPage}
      pageSize={RECIPES_PER_PAGE}
      onPageChange={onPageChange}
      onSelect={onOpenRecipe}
      onAction={(id, action) => {
        if (action === "run") {
          const recipe = recipes.find((r) => r.id === id)
          if (recipe) onRunRecipe(recipe)
        } else if (action === "delete") {
          onDeleteRecipe(id)
        }
      }}
      isRunning={isRunning}
      getItemId={(recipe) => recipe.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      listClassName={styles.virtualListWrapper}
    />
  )
}
