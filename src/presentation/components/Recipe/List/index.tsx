import { Play, Plus, Trash2, Zap } from "lucide-react"
import type { AutomationRecipe } from "../../../../domain/entities/automations/automations"
import { List } from "../../List"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"
import { IconActionButton } from "../../Button"

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
        <button
          type="button"
          className="mini-btn"
          title={t("newRecipe")}
          aria-label={t("newRecipe")}
          onClick={onCreateRecipe}
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          className="mini-btn"
          title={t("loadExample")}
          aria-label={t("loadExample")}
          onClick={onLoadExample}
        >
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
      <button type="button" className={styles.itemContent} onClick={() => onOpenRecipe(recipe.id)}>
        <span className={styles.recipeName}>{recipe.name}</span>
        <span className={styles.recipeMeta}>
          {recipe.steps.length} {t("steps").toLowerCase()}
        </span>
      </button>
      <div className={styles.itemActions}>
        <IconActionButton
          icon={<Play size={16} />}
          tone="success"
          disabled={isRunning || recipe.steps.length === 0}
          onClick={() => onRunRecipe(recipe)}
          label={t("runRecipe")}
        />
        <IconActionButton
          icon={<Trash2 size={16} />}
          tone="danger"
          onClick={() => onDeleteRecipe(recipe.id)}
          label={t("deleteRecipe")}
        />
      </div>
    </>
  )

  return (
    <List.Paged<AutomationRecipe>
      items={recipes}
      selectedId={selectedRecipeId}
      currentPage={currentPage}
      pageSize={RECIPES_PER_PAGE}
      onPageChange={onPageChange}
      getItemId={(recipe) => recipe.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      listClassName={styles.virtualListWrapper}
    />
  )
}
