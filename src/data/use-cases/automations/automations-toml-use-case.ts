import { _Either } from "funcio"
import { parse, stringify } from "smol-toml"
import type {
  AutomationRecipe,
  AutomationStep,
  MonitorAutomation,
} from "../../../domain/entities/automations/automations"
import type { IAutomationsTomlUseCase } from "../../../domain/entities/automations/automations-toml"
import { newId as defaultNewId } from "../../../shared/utils/id"
import {
  isImportableMonitor,
  isImportableRecipe,
  normalizeImportedMonitor,
  normalizeImportedRecipe,
  parseTomlPayload,
} from "./automation-codec"

interface TomlStep {
  id: string
  run: { command: string; target: unknown }
  when?: { kind: string; arg?: string }
  else?: { command: string; target: unknown }
}

interface TomlRecipe {
  id: string
  name: string
  description: string
  repo_path: string
  variables: string[]
  step: TomlStep[]
}

interface TomlBlock {
  id: string
  label: string
  icon: string
  color: string
  commands: string[]
}

interface TomlMonitor {
  id: string
  name: string
  description: string
  icon: string
  color: string
  repo_path: string
  path: string
  trigger: unknown
  block: TomlBlock[]
}

export class AutomationsTomlUseCase implements IAutomationsTomlUseCase {
  constructor(private readonly idGenerator: (prefix: string) => string = defaultNewId) {}

  private mapStep(step: AutomationStep): TomlStep {
    const entry: TomlStep = {
      id: step.id,
      run: { command: step.run.command, target: step.run.target },
    }
    if (step.when) {
      entry.when = { ...step.when }
    }
    if (step.else) {
      entry.else = { command: step.else.command, target: step.else.target }
    }
    return entry
  }

  private mapRecipe(recipe: AutomationRecipe): TomlRecipe {
    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      repo_path: recipe.repoPath,
      variables: recipe.variables,
      step: recipe.steps.map((step) => this.mapStep(step)),
    }
  }

  private mapMonitor(monitor: MonitorAutomation): TomlMonitor {
    return {
      id: monitor.id,
      name: monitor.name,
      description: monitor.description,
      icon: monitor.icon,
      color: monitor.color,
      repo_path: monitor.repoPath,
      path: monitor.path,
      trigger: monitor.trigger,
      block: monitor.blocks.map((block) => ({
        id: block.id,
        label: block.label,
        icon: block.icon,
        color: block.color,
        commands: block.commands,
      })),
    }
  }

  serializeAutomationsToml(recipes: AutomationRecipe[], monitors: MonitorAutomation[]): string {
    return stringify({
      recipe: recipes.map((recipe) => this.mapRecipe(recipe)),
      monitor: monitors.map((monitor) => this.mapMonitor(monitor)),
    })
  }

  deserializeAutomationsToml(tomlString: string): {
    recipes: AutomationRecipe[]
    monitors: MonitorAutomation[]
  } {
    const result = _Either.try.sync(() => parse(tomlString) as Record<string, unknown> | null | undefined)
    if (result.isLeft()) {
      return { recipes: [], monitors: [] }
    }

    const parsed = result.value as Record<string, unknown> | null | undefined
    const { recipes: rawRecipes, monitors: rawMonitors } = parseTomlPayload(parsed)

    return {
      recipes: rawRecipes.filter(isImportableRecipe).map((recipe) => normalizeImportedRecipe(recipe, this.idGenerator)),
      monitors: rawMonitors
        .filter(isImportableMonitor)
        .map((monitor) => normalizeImportedMonitor(monitor, this.idGenerator)),
    }
  }
}
