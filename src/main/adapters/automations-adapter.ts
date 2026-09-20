import type {
  AutomationAlias,
  AutomationRecipe,
  AutomationStep,
  BlockTemplate,
  ConditionKind,
  MonitorAutomation,
  MonitorBlock,
} from "../../domain/entities/automations/automations"
import { automationsTomlUseCase, automationsUseCase } from "../factories/use-cases/automations-factory"
import { newId as sharedNewId } from "../../shared/utils/id"

export const newId = (prefix: string): string => sharedNewId(prefix)
export const emptyRecipe = (): AutomationRecipe => automationsUseCase.createEmptyRecipe()
export const emptyStep = (): AutomationStep => automationsUseCase.createEmptyStep()
export const emptyMonitor = (): MonitorAutomation => automationsUseCase.createEmptyMonitor()
export const emptyBlock = (): MonitorBlock => automationsUseCase.createEmptyMonitorBlock()
export const filterBlocks = (category: string): BlockTemplate[] => automationsUseCase.filterCategoryBlocks(category)
export const recipeVariables = (recipe: AutomationRecipe): string[] => automationsUseCase.extractRecipeVariables(recipe)
export const conditionArgs = (condition: { kind: ConditionKind; arg: string }): string[] =>
  automationsUseCase.buildConditionArgs(condition)
export const expandAlias = (command: string, aliases: AutomationAlias[]): string =>
  automationsUseCase.expandAlias(command, aliases)
export const parseClean = (output: string): boolean => automationsUseCase.isClean(output)
export const parseSubmoduleReady = (output: string): boolean => automationsUseCase.isSubmoduleReady(output)
export const resolveVariables = (command: string, variableValues: Record<string, string>): string =>
  automationsUseCase.resolveVariables(command, variableValues)
export const substituteVariables = resolveVariables

export const validateAction = (command: string, aliases: AutomationAlias[]): "empty" | "unknown-verb" | null =>
  automationsUseCase.validateAction(command, aliases)
export const validateCommand = validateAction

export const serializeAutomationsToml = (recipes: AutomationRecipe[], monitors: MonitorAutomation[]): string =>
  automationsTomlUseCase.serializeAutomationsToml(recipes, monitors)
export const deserializeAutomationsToml = (
  tomlString: string,
): {
  recipes: AutomationRecipe[]
  monitors: MonitorAutomation[]
} => automationsTomlUseCase.deserializeAutomationsToml(tomlString)
