import type { AutomationRecipe, MonitorAutomation } from "./automations"

export interface IAutomationsTomlUseCase {
  serializeAutomationsToml(recipes: AutomationRecipe[], monitors: MonitorAutomation[]): string
  deserializeAutomationsToml(tomlString: string): {
    recipes: AutomationRecipe[]
    monitors: MonitorAutomation[]
  }
}
