import type {
  AutomationRecipe,
  AutomationShortcut,
  MonitorAutomation as AutomationMonitor,
} from "../../../../domain/entities/automations"

export interface ShortcutTarget {
  displayName: string
  repoPath: string
  isRecipe: boolean
}

export function resolveShortcutTarget(
  shortcut: AutomationShortcut,
  recipesById: Map<string, AutomationRecipe>,
  monitorsById: Map<string, AutomationMonitor>,
): ShortcutTarget {
  const isRecipe = shortcut.targetType === "recipe"
  const target = isRecipe ? recipesById.get(shortcut.targetId) : monitorsById.get(shortcut.targetId)

  return {
    displayName: target?.name ?? shortcut.targetId,
    repoPath: target?.repoPath ?? "",
    isRecipe,
  }
}

export type Translate = (key: "recipeShort" | "monitorShort") => string

export function matchesSearch(
  shortcut: AutomationShortcut,
  recipesById: Map<string, AutomationRecipe>,
  monitorsById: Map<string, AutomationMonitor>,
  translate: Translate,
  searchQuery: string,
): boolean {
  const { displayName, isRecipe } = resolveShortcutTarget(shortcut, recipesById, monitorsById)
  const typeLabel = translate(isRecipe ? "recipeShort" : "monitorShort")
  const normalizedQuery = searchQuery.trim().toLowerCase()
  if (!normalizedQuery) return true
  return `${displayName} ${typeLabel}`.toLowerCase().includes(normalizedQuery)
}
