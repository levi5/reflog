import { CONDITION_KINDS, KNOWN_GIT_VERBS, MONITOR_BLOCK_TEMPLATES } from "../../../shared/constants/automations"
import { localStorageAdapter } from "../../../infrastructure/storage"
import type { IStorage } from "../../protocols/storage"
import { newId } from "../../../shared/utils/id"
import {
  DEFAULT_BLOCK_COLOR,
  DEFAULT_BLOCK_ICON,
  DEFAULT_RECIPE_COLOR,
  DEFAULT_RECIPE_ICON,
} from "../../../shared/constants/theme"
import type {
  AutomationAlias,
  AutomationRecipe,
  AutomationShortcut,
  AutomationStep,
  AutomationStore,
  BlockTemplate,
  ConditionKind,
  IAutomationsUseCase,
  MonitorAutomation,
  MonitorBlock,
} from "../../../domain/entities/automations/automations"

export class AutomationsUseCase implements IAutomationsUseCase {
  generateId(prefix: string): string {
    return newId(prefix)
  }

  createEmptyRecipe(): AutomationRecipe {
    return {
      id: this.generateId("recipe"),
      name: "",
      description: "",
      repoPath: "",
      variables: [],
      steps: [],
    }
  }

  createEmptyStep(): AutomationStep {
    return {
      id: this.generateId("step"),
      when: null,
      run: { command: "", target: "repo" },
    }
  }

  createEmptyMonitor(): MonitorAutomation {
    return {
      id: this.generateId("monitor"),
      name: "",
      description: "",
      icon: DEFAULT_RECIPE_ICON,
      color: DEFAULT_RECIPE_COLOR,
      repoPath: "",
      path: "",
      trigger: { kind: "manual" },
      blocks: [],
    }
  }

  createEmptyMonitorBlock(): MonitorBlock {
    return {
      id: this.generateId("block"),
      label: "",
      icon: DEFAULT_BLOCK_ICON,
      color: DEFAULT_BLOCK_COLOR,
      commands: [""],
    }
  }

  filterCategoryBlocks(category: string): BlockTemplate[] {
    return MONITOR_BLOCK_TEMPLATES.filter((block: BlockTemplate) => block.category === category)
  }

  extractRecipeVariables(recipe: AutomationRecipe): string[] {
    const variables = new Set<string>()
    const varRegex = /\{\{(\w+)\}\}/g

    for (const step of recipe.steps) {
      for (const match of step.run.command.matchAll(varRegex)) {
        variables.add(match[1])
      }
      if (step.else?.command) {
        for (const match of step.else.command.matchAll(varRegex)) {
          variables.add(match[1])
        }
      }
      if (step.when?.arg) {
        for (const match of step.when.arg.matchAll(varRegex)) {
          variables.add(match[1])
        }
      }
    }

    return Array.from(variables)
  }

  buildConditionArgs(condition: { kind: ConditionKind; arg: string }): string[] {
    const isKnownKind = CONDITION_KINDS.some((kind: ConditionKind) => kind === condition.kind)
    if (!isKnownKind) return []
    return [...CONDITION_KINDS.filter((kind: ConditionKind) => kind !== condition.kind), condition.arg]
  }

  expandAlias(command: string, aliases: AutomationAlias[]): string {
    let expanded = command
    for (const alias of aliases) {
      const regex = new RegExp(`(^|\\s)!${alias.name}(\\s|$)`, "g")
      expanded = expanded.replace(regex, `$1${alias.expansion}$2`)
    }
    return expanded
  }

  isClean(output: string): boolean {
    return output.trim() === ""
  }

  isSubmoduleReady(output: string): boolean {
    return !output.includes("+") && !output.includes("-") && !output.includes("U")
  }

  resolveVariables(command: string, variableValues: Record<string, string>): string {
    return command.replace(/\{\{(\w+)\}\}/g, (_, key) => variableValues[key] ?? "")
  }

  validateAction(command: string, aliases: AutomationAlias[]): "empty" | "unknown-verb" | null {
    const expanded = this.expandAlias(command, aliases).trim()
    if (!expanded) return "empty"
    const firstWord = expanded.split(/\s+/)[0]
    if (!firstWord || !KNOWN_GIT_VERBS.has(firstWord)) return "unknown-verb"
    return null
  }
}

const AUTOMATIONS_STORAGE_KEY = "forgegit.automations"

function emptyAutomationStore(): AutomationStore {
  return { recipes: [], aliases: [], monitors: [], shortcuts: [] }
}

export function loadAutomationStore(storage: IStorage = localStorageAdapter): AutomationStore {
  try {
    const record = storage.get<Partial<AutomationStore> | null>(AUTOMATIONS_STORAGE_KEY, null)
    if (!record || typeof record !== "object") {
      return emptyAutomationStore()
    }
    return {
      recipes: Array.isArray(record.recipes)
        ? record.recipes.map((recipe) => ({
            ...recipe,
            repoPath: recipe.repoPath ?? "",
          }))
        : [],
      aliases: Array.isArray(record.aliases) ? record.aliases : [],
      monitors: Array.isArray(record.monitors)
        ? record.monitors.map((monitor) => ({
            ...monitor,
            repoPath: monitor.repoPath ?? "",
          }))
        : [],
      shortcuts: Array.isArray(record.shortcuts)
        ? record.shortcuts.filter(
            (shortcut): shortcut is AutomationShortcut =>
              !!shortcut &&
              typeof shortcut.id === "string" &&
              typeof shortcut.targetId === "string" &&
              (shortcut.targetType === "recipe" || shortcut.targetType === "monitor") &&
              typeof shortcut.color === "string",
          )
        : [],
    }
  } catch {
    return emptyAutomationStore()
  }
}

export function persistAutomationStore(store: AutomationStore, storage: IStorage = localStorageAdapter): boolean {
  try {
    storage.set(AUTOMATIONS_STORAGE_KEY, store)
    return true
  } catch {
    return false
  }
}

export function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) {
    merged.set(item.id, item)
  }
  return Array.from(merged.values())
}

export function mergeByName<T extends { name: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.name, item]))
  for (const item of incoming) {
    merged.set(item.name, item)
  }
  return Array.from(merged.values())
}
