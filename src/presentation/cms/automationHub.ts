import type { Lang } from "../../types"

export type AutomationHubSection = "recipes" | "monitors" | "templates"

export interface AutomationHubSectionCopy {
  label: string
  hint: string
}

export type AutomationHubSectionCopyMap = Record<AutomationHubSection, AutomationHubSectionCopy>

export interface AutomationHubCopy {
  title: string
  subtitle: string
  sections: AutomationHubSectionCopyMap
  steps: string[]
}

export const AUTOMATION_HUB_COPY: Record<Lang, AutomationHubCopy> = {
  pt: {
    title: "Automação",
    subtitle: "Organize tarefas repetidas do repositório em um só lugar.",
    sections: {
      recipes: {
        label: "Receitas",
        hint: "Monte um fluxo de comandos Git e execute quando precisar.",
      },
      monitors: {
        label: "Monitors",
        hint: "Agrupe verificações manuais para rodar no repositório aberto.",
      },
      templates: {
        label: "Templates",
        hint: "Configure templates de commit.",
      },
    },
    steps: ["Crie", "Configure", "Revise e execute"],
  },
  en: {
    title: "Automation",
    subtitle: "Keep recurring repository tasks in one place.",
    sections: {
      recipes: {
        label: "Recipes",
        hint: "Build a Git command flow and run it when needed.",
      },
      monitors: {
        label: "Monitores",
        hint: "Group manual checks to run in the open repository.",
      },
      templates: {
        label: "Templates",
        hint: "Configure commit presets, preferences and templates.",
      },
    },
    steps: ["Create", "Configure", "Review and run"],
  },
}

export const AUTOMATION_HUB_SECTION_IDS: AutomationHubSection[] = ["recipes", "monitors", "templates"]
