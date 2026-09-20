import type { AutomationStore } from "../../../domain/entities/automations/automations"
import {
  collectValidAliases,
  collectValidMonitors,
  collectValidRecipes,
  collectValidShortcuts,
  parseImportPayload,
} from "./automation-codec"
import { AutomationsTomlUseCase } from "./automations-toml-use-case"

export function readAutomationImport(rawText: string, fileName: string): AutomationStore {
  const payload = fileName.toLowerCase().endsWith(".toml")
    ? { ...new AutomationsTomlUseCase().deserializeAutomationsToml(rawText), aliases: [], shortcuts: [] }
    : parseImportPayload(rawText)

  return {
    recipes: collectValidRecipes(payload.recipes),
    aliases: collectValidAliases(payload.aliases),
    monitors: collectValidMonitors(payload.monitors),
    shortcuts: collectValidShortcuts(payload.shortcuts),
  }
}

export {
  collectValidAliases,
  collectValidMonitors,
  collectValidRecipes,
  collectValidShortcuts,
  isImportableMonitor,
  isImportableRecipe,
  isRecord,
  normalizeImportedBlock,
  normalizeImportedMonitor,
  normalizeImportedRecipe,
  normalizeImportedStep,
  parseAutomationTarget,
  parseCondition,
  parseImportPayload,
  parseMonitorTrigger,
  parseTomlPayload,
} from "./automation-codec"
export type { AutomationImportPayload } from "./automation-codec"
export { DEFAULT_IMPORTED_SHORTCUT_COLOR } from "../../../shared/constants/theme"
