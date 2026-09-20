import { AutomationsUseCase } from "../../../data/use-cases/automations/automations-use-case"
import { AutomationsTomlUseCase } from "../../../data/use-cases/automations/automations-toml-use-case"

export const makeAutomationsUseCase = (): AutomationsUseCase => {
  return new AutomationsUseCase()
}

export const makeAutomationsTomlUseCase = (): AutomationsTomlUseCase => {
  return new AutomationsTomlUseCase()
}

export const automationsUseCase = makeAutomationsUseCase()
export const automationsTomlUseCase = makeAutomationsTomlUseCase()
