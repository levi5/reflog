import { z } from "zod"
import type {
  AutomationAlias,
  AutomationRecipe,
  AutomationShortcut,
  AutomationStep,
  AutomationTarget,
  Condition,
  MonitorAutomation,
  MonitorBlock,
} from "../../../domain/entities/automations/automations"
import {
  automationAliasSchema,
  automationShortcutSchema,
  automationTargetSchema,
  conditionInputSchema,
  triggerInputSchema,
} from "../../../shared/schemas/automation"
import {
  DEFAULT_BLOCK_COLOR,
  DEFAULT_BLOCK_ICON,
  DEFAULT_MONITOR_COLOR,
  DEFAULT_MONITOR_ICON,
} from "../../../shared/constants/theme"
import { newId as defaultNewId } from "../../../shared/utils/id"

export interface AutomationImportPayload {
  recipes: unknown
  aliases: unknown
  monitors: unknown
  shortcuts: unknown
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? value : null
}

function stringWithDefault(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function pickList(record: Record<string, unknown>, pluralKey: string, singularKey: string): unknown {
  if (record[pluralKey] !== undefined) return record[pluralKey]
  const single = record[singularKey]
  if (single === undefined) return []
  return Array.isArray(single) ? single : [single]
}

export function parseAutomationTarget(target: unknown): AutomationTarget {
  const parsed = automationTargetSchema.safeParse(target)
  if (!parsed.success) return "repo"
  const data = parsed.data
  return typeof data === "string" ? data : { submodule: data.submodule }
}

const CONDITION_WITH_ARG = new Set(["branch-exists", "tag-exists", "command-ok"])
const CONDITION_OPTIONAL_ARG = new Set(["clean", "submodule-ready"])

export function parseCondition(rawWhen: unknown): Condition | null {
  const parsed = conditionInputSchema.safeParse(rawWhen)
  if (!parsed.success) return null
  const { kind, arg } = parsed.data
  if (CONDITION_WITH_ARG.has(kind)) {
    return { kind, arg } as Condition
  }
  if (CONDITION_OPTIONAL_ARG.has(kind)) {
    return (arg ? { kind, arg } : { kind }) as Condition
  }
  return null
}

export function parseMonitorTrigger(rawTrigger: unknown, defaultPath = ""): MonitorAutomation["trigger"] {
  const parsed = triggerInputSchema.safeParse(rawTrigger)
  if (parsed.success) {
    if (parsed.data.kind === "manual") return { kind: "manual" }
    if (parsed.data.kind === "on-enter") {
      return { kind: "on-enter", path: parsed.data.path || defaultPath }
    }
  }
  if (rawTrigger === "manual") return { kind: "manual" }
  if (isRecord(rawTrigger) && rawTrigger.kind === "on-enter") {
    const path = typeof rawTrigger.path === "string" && rawTrigger.path ? rawTrigger.path : defaultPath
    return { kind: "on-enter", path }
  }
  return { kind: "manual" }
}

function parseRunCommand(raw: Record<string, unknown>): { command: string; target: AutomationTarget } {
  const runRecord = isRecord(raw.run) ? raw.run : undefined
  const command =
    typeof raw.command === "string" ? raw.command : typeof runRecord?.command === "string" ? runRecord.command : ""
  return { command, target: parseAutomationTarget(runRecord?.target) }
}

export function normalizeImportedStep(raw: unknown, idGen: (prefix: string) => string = defaultNewId): AutomationStep {
  if (!isRecord(raw)) {
    return { id: idGen("step"), when: null, run: { command: "", target: "repo" } }
  }
  const { command, target } = parseRunCommand(raw)

  let elseAction: AutomationStep["else"]
  if (isRecord(raw.else) && typeof raw.else.command === "string" && raw.else.command.trim()) {
    elseAction = { command: raw.else.command, target: parseAutomationTarget(raw.else.target) }
  }

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : idGen("step"),
    when: parseCondition(raw.when),
    run: { command, target },
    ...(elseAction ? { else: elseAction } : {}),
  }
}

export function normalizeImportedRecipe(
  raw: unknown,
  idGen: (prefix: string) => string = defaultNewId,
): AutomationRecipe {
  const recipe = isRecord(raw) ? raw : {}
  const rawSteps = pickList(recipe, "steps", "step")

  return {
    id: typeof recipe.id === "string" && recipe.id ? recipe.id : idGen("recipe"),
    name: stringWithDefault(recipe.name, ""),
    description: stringWithDefault(recipe.description, ""),
    repoPath:
      typeof recipe.repoPath === "string"
        ? recipe.repoPath
        : typeof recipe.repo_path === "string"
          ? recipe.repo_path
          : "",
    variables: stringArray(recipe.variables),
    steps: Array.isArray(rawSteps) ? rawSteps.map((s) => normalizeImportedStep(s, idGen)) : [],
  }
}

const BLOCK_FALLBACK = { label: "", icon: DEFAULT_BLOCK_ICON, color: DEFAULT_BLOCK_COLOR } as const
const MONITOR_FALLBACK = { icon: DEFAULT_MONITOR_ICON, color: DEFAULT_MONITOR_COLOR } as const

export function normalizeImportedBlock(raw: unknown, idGen: (prefix: string) => string = defaultNewId): MonitorBlock {
  if (!isRecord(raw)) {
    return { id: idGen("block"), ...BLOCK_FALLBACK, commands: [] }
  }
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : idGen("block"),
    label: stringWithDefault(raw.label, BLOCK_FALLBACK.label),
    icon: stringWithDefault(raw.icon, BLOCK_FALLBACK.icon),
    color: stringWithDefault(raw.color, BLOCK_FALLBACK.color),
    commands: stringArray(raw.commands),
  }
}

export function normalizeImportedMonitor(
  raw: unknown,
  idGen: (prefix: string) => string = defaultNewId,
): MonitorAutomation {
  const monitor = isRecord(raw) ? raw : {}
  const rawBlocks = pickList(monitor, "blocks", "block")
  const repoPath =
    typeof monitor.repoPath === "string"
      ? monitor.repoPath
      : typeof monitor.repo_path === "string"
        ? monitor.repo_path
        : ""
  const path = stringWithDefault(monitor.path, "")

  return {
    id: typeof monitor.id === "string" && monitor.id ? monitor.id : idGen("monitor"),
    name: stringWithDefault(monitor.name, ""),
    description: stringWithDefault(monitor.description, ""),
    icon: stringWithDefault(monitor.icon, MONITOR_FALLBACK.icon),
    color: stringWithDefault(monitor.color, MONITOR_FALLBACK.color),
    repoPath,
    path,
    trigger: parseMonitorTrigger(monitor.trigger, path || repoPath),
    blocks: Array.isArray(rawBlocks) ? rawBlocks.map((b) => normalizeImportedBlock(b, idGen)) : [],
  }
}

export function isImportableRecipe(value: unknown): boolean {
  return nonEmptyString(isRecord(value) ? value.name : undefined) !== null
}

export function isImportableMonitor(value: unknown): boolean {
  return nonEmptyString(isRecord(value) ? value.name : undefined) !== null
}

export function collectValidRecipes(value: unknown, idGen?: (prefix: string) => string): AutomationRecipe[] {
  if (!Array.isArray(value)) return []
  return value.filter(isImportableRecipe).map((recipe) => normalizeImportedRecipe(recipe, idGen))
}

export function collectValidAliases(value: unknown): AutomationAlias[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = automationAliasSchema.safeParse(item)
    if (!parsed.success) return []
    const { name, expansion, color } = parsed.data
    return [{ name, expansion, ...(color ? { color } : {}) }]
  })
}

export function collectValidMonitors(value: unknown, idGen?: (prefix: string) => string): MonitorAutomation[] {
  if (!Array.isArray(value)) return []
  return value.filter(isImportableMonitor).map((monitor) => normalizeImportedMonitor(monitor, idGen))
}

const shortcutArraySchema = z.array(automationShortcutSchema)

export function collectValidShortcuts(
  value: unknown,
  idGen: (prefix: string) => string = defaultNewId,
  defaultColor = "var(--accent)",
): AutomationShortcut[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = automationShortcutSchema.safeParse(item)
    if (!parsed.success) return []
    return [
      {
        targetId: parsed.data.targetId,
        targetType: parsed.data.targetType,
        id: parsed.data.id || idGen("shortcut"),
        color: parsed.data.color || defaultColor,
      },
    ]
  })
}

export { shortcutArraySchema }

export function parseImportPayload(rawText: string): AutomationImportPayload {
  const parsedPayload: unknown = JSON.parse(rawText)
  if (Array.isArray(parsedPayload)) {
    return { recipes: parsedPayload, aliases: [], monitors: [], shortcuts: [] }
  }
  if (!isRecord(parsedPayload)) {
    return { recipes: [], aliases: [], monitors: [], shortcuts: [] }
  }
  if ("steps" in parsedPayload || "step" in parsedPayload) {
    return { recipes: [parsedPayload], aliases: [], monitors: [], shortcuts: [] }
  }
  if ("blocks" in parsedPayload || "block" in parsedPayload) {
    return { recipes: [], aliases: [], monitors: [parsedPayload], shortcuts: [] }
  }
  return {
    recipes: pickList(parsedPayload, "recipes", "recipe"),
    aliases: pickList(parsedPayload, "aliases", "alias"),
    monitors: pickList(parsedPayload, "monitors", "monitor"),
    shortcuts: pickList(parsedPayload, "shortcuts", "shortcut"),
  }
}

export function parseTomlPayload(parsed: Record<string, unknown> | null | undefined): {
  recipes: unknown[]
  monitors: unknown[]
} {
  const rawRecipes = Array.isArray(parsed?.recipe)
    ? parsed.recipe
    : parsed?.recipe && typeof parsed.recipe === "object"
      ? [parsed.recipe]
      : []
  const rawMonitors = Array.isArray(parsed?.monitor)
    ? parsed.monitor
    : parsed?.monitor && typeof parsed.monitor === "object"
      ? [parsed.monitor]
      : []
  return {
    recipes: rawRecipes.filter(isImportableRecipe),
    monitors: rawMonitors.filter(isImportableMonitor),
  }
}
