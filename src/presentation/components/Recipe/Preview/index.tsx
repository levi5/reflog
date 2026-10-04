import { automationsUseCase, gitCommandParserUseCase } from "../../../../data"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "../../../context"
import type { StringKey } from "../../../../i18n"
import type { AutomationAlias, AutomationStep } from "../../../../domain/entities/automations/automations"
import styles from "./style.module.scss"

const INVALID_MESSAGE_KEYS: Record<string, StringKey> = {
  empty: "invalidEmpty",
  "unknown-verb": "invalidVerb",
}

function getInvalidMessageKey(command: string, aliases: AutomationAlias[]): StringKey | null {
  const validationResult = automationsUseCase.validateAction(command, aliases)
  if (!validationResult) return null
  return INVALID_MESSAGE_KEYS[validationResult] ?? null
}

function resolvePreviewCommand(
  rawCommand: string,
  aliases: AutomationAlias[],
  variableValues: Record<string, string>,
): string {
  const expandedCommand = automationsUseCase.expandAlias(rawCommand, aliases)
  const resolvedCommand = automationsUseCase.resolveVariables(expandedCommand, variableValues)
  return gitCommandParserUseCase.stripGitPrefix(resolvedCommand)
}

interface PreviewListRowProps {
  automationStep: AutomationStep
  aliases: AutomationAlias[]
  variableValues: Record<string, string>
}

function PreviewListRow({ automationStep, aliases, variableValues }: PreviewListRowProps) {
  const { t } = useTranslation()
  const previewCommand = resolvePreviewCommand(automationStep.run.command, aliases, variableValues)
  const invalidMessageKey = getInvalidMessageKey(previewCommand, aliases)
  return (
    <div className={styles.previewRow}>
      <code>$ git {previewCommand || "…"}</code>
      {gitCommandParserUseCase.isDangerousCmd(previewCommand) && <TriangleAlert size={12} />}
      {invalidMessageKey && <span className={styles.invalid}>{t(invalidMessageKey)}</span>}
    </div>
  )
}

export interface PreviewListProps {
  draftRecipe: { steps: AutomationStep[] }
  aliases: AutomationAlias[]
  variableValues: Record<string, string>
}

export function PreviewList({ draftRecipe, aliases, variableValues }: PreviewListProps) {
  return (
    <div className={styles.preview}>
      {draftRecipe.steps.map((automationStep) => (
        <PreviewListRow
          key={automationStep.id}
          automationStep={automationStep}
          aliases={aliases}
          variableValues={variableValues}
        />
      ))}
    </div>
  )
}
