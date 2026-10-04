import { automationsTomlUseCase } from "../../../data"
import { save } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"
import type { AutomationRecipe } from "../../../domain/entities/automations/automations"
import { readAutomationImport } from "../../../data/use-cases/automations/automation-import-use-case"
import { t } from "../../../i18n"
import { EXPORT_AUTOMATIONS_FILE } from "../../../shared/constants/limits"
import type { Lang } from "../../../types"
import type { useAutomations } from "./useAutomations"

type TransferStore = Pick<ReturnType<typeof useAutomations>, "recipes" | "monitors" | "importAutomations">

interface TransferOptions {
  lang: Lang
  automations: TransferStore
  selectedRecipeId: string | null
  onSelectRecipe: (recipe: AutomationRecipe) => void
  setFeedbackMessage: (message: string) => void
}

export function useAutomationTransfer({
  lang,
  automations,
  selectedRecipeId,
  onSelectRecipe,
  setFeedbackMessage,
}: TransferOptions) {
  const exportAutomations = async () => {
    try {
      const tomlContent = automationsTomlUseCase.serializeAutomationsToml(automations.recipes, automations.monitors)
      const targetPath = await save({
        defaultPath: EXPORT_AUTOMATIONS_FILE,
        filters: [{ name: "TOML", extensions: ["toml"] }],
      })
      if (!targetPath) return
      await writeTextFile(targetPath, tomlContent)
      setFeedbackMessage("")
    } catch {
      setFeedbackMessage(t(lang, "exportError"))
    }
  }

  const importAutomationsFromFile = async (importFile: File) => {
    try {
      const rawText = await importFile.text()
      const { recipes, aliases, monitors, shortcuts } = readAutomationImport(rawText, importFile.name)

      automations.importAutomations({
        recipes,
        aliases,
        monitors,
        shortcuts,
      })

      if (recipes.length > 0 && !selectedRecipeId) {
        onSelectRecipe(recipes[0])
      }

      setFeedbackMessage("")
    } catch {
      setFeedbackMessage(t(lang, "importError"))
    }
  }

  return { exportAutomations, importAutomationsFromFile }
}
