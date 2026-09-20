export type AutomationAlias = {
  name: string
  expansion: string
  color?: string
}

export type AutomationTarget = "repo" | "all-submodules" | { submodule: string }

export type BlockCategoryId = "git" | "submodule" | "node" | "docker" | "custom"

export interface BlockTemplate {
  id: string
  label: string
  icon: string
  color: string
  category: string
  defaultCommands: string[]
}

export type ConditionKind = "branch-exists" | "tag-exists" | "clean" | "submodule-ready" | "command-ok"

export type Condition =
  | { kind: "branch-exists"; arg: string }
  | { kind: "tag-exists"; arg: string }
  | { kind: "clean"; arg?: string }
  | { kind: "submodule-ready"; arg?: string }
  | { kind: "command-ok"; arg: string }

export type AutomationStep = {
  id: string
  when: Condition | null
  run: {
    command: string
    target: AutomationTarget
  }
  else?: {
    command: string
    target: AutomationTarget
  }
}

export type AutomationRecipe = {
  id: string
  name: string
  description: string
  repoPath: string
  variables: string[]
  steps: AutomationStep[]
}

export type MonitorTrigger = { kind: "manual" } | { kind: "on-enter"; path: string }

export type MonitorBlock = {
  id: string
  label: string
  icon: string
  color: string
  commands: string[]
}

export type MonitorAutomation = {
  id: string
  name: string
  description: string
  icon: string
  color: string
  repoPath: string
  path: string
  trigger: MonitorTrigger
  blocks: MonitorBlock[]
}

export type AutomationShortcut = {
  id: string
  targetId: string
  targetType: "recipe" | "monitor"
  color: string
}

export type AutomationLogLine = {
  at: number
  target: string
  cmd: string
  out: string
  err: boolean
}

export type AutomationStore = {
  recipes: AutomationRecipe[]
  aliases: AutomationAlias[]
  monitors: MonitorAutomation[]
  shortcuts: AutomationShortcut[]
}

export interface IAutomationsUseCase {
  generateId(prefix: string): string
  createEmptyRecipe(): AutomationRecipe
  createEmptyStep(): AutomationStep
  createEmptyMonitor(): MonitorAutomation
  createEmptyMonitorBlock(): MonitorBlock
  filterCategoryBlocks(category: string): BlockTemplate[]
  extractRecipeVariables(recipe: AutomationRecipe): string[]
  buildConditionArgs(condition: { kind: ConditionKind; arg: string }): string[]
  expandAlias(command: string, aliases: AutomationAlias[]): string
  isClean(output: string): boolean
  isSubmoduleReady(output: string): boolean
  resolveVariables(command: string, variableValues: Record<string, string>): string
  validateAction(command: string, aliases: AutomationAlias[]): "empty" | "unknown-verb" | null
}
