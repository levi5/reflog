import { Plus, Trash2 } from "lucide-react"
import type { AutomationRecipe, AutomationStep, Condition } from "../../../../domain/entities/automations/automations"
import { CONDITION_KINDS } from "../../../../shared/constants/automations"
import type { StringKey } from "../../../../i18n"
import { Select } from "../../Select"
import { Switch } from "../../Switch"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

const ALWAYS_CONDITION_VALUE = "always"

const CONDITION_LABEL_KEYS: Record<Condition["kind"], StringKey> = {
  "branch-exists": "condBranchExists",
  "tag-exists": "condTagExists",
  clean: "condClean",
  "submodule-ready": "condSubmoduleReady",
  "command-ok": "condCommandOk",
}

type Translate = (key: StringKey) => string

function getConditionLabel(translate: Translate, kind: Condition["kind"]): string {
  return translate(CONDITION_LABEL_KEYS[kind])
}

function buildConditionOptions(translate: Translate): Array<{ value: string; label: string }> {
  const alwaysOption = {
    value: ALWAYS_CONDITION_VALUE,
    label: translate("condAlways"),
  }
  const conditionOptions = CONDITION_KINDS.map((conditionKind) => ({
    value: conditionKind,
    label: getConditionLabel(translate, conditionKind),
  }))
  return [alwaysOption, ...conditionOptions]
}

function parseConditionKind(value: string): Condition["kind"] | null {
  const matchedKind = CONDITION_KINDS.find((conditionKind) => conditionKind === value)
  return matchedKind ?? null
}

interface StepConditionEditorProps {
  automationStep: AutomationStep
  onTransformStep: (transformStep: (automationStep: AutomationStep) => AutomationStep) => void
}

function StepConditionEditor({ automationStep, onTransformStep }: StepConditionEditorProps) {
  const { t } = useTranslation()
  const handleConditionChange = (selectedValue: string) => {
    if (selectedValue === ALWAYS_CONDITION_VALUE) {
      onTransformStep((previousStep) => ({ ...previousStep, when: null }))
      return
    }
    const conditionKind = parseConditionKind(selectedValue)
    if (conditionKind === null) return
    onTransformStep((previousStep) => ({
      ...previousStep,
      when: {
        kind: conditionKind,
        arg: previousStep.when?.arg ?? "",
      },
    }))
  }
  const conditionValue = automationStep.when ? automationStep.when.kind : ALWAYS_CONDITION_VALUE
  const shouldShowConditionArg = automationStep.when !== null && automationStep.when.kind !== "clean"
  return (
    <div className={styles.condRow}>
      <span className={styles.whenLabel}>{t("condIf")}</span>
      <Select
        label={t("steps")}
        value={conditionValue}
        options={buildConditionOptions(t)}
        onChange={handleConditionChange}
      />
      {shouldShowConditionArg && automationStep.when && (
        <input
          value={automationStep.when.arg}
          placeholder={t("condArg")}
          aria-label={t("condArg")}
          onChange={(changeEvent) =>
            onTransformStep((previousStep) =>
              previousStep.when
                ? {
                    ...previousStep,
                    when: {
                      ...previousStep.when,
                      arg: changeEvent.target.value,
                    },
                  }
                : previousStep,
            )
          }
        />
      )}
    </div>
  )
}

interface StepEditorProps {
  stepIndex: number
  automationStep: AutomationStep
  onTransformStep: (transformStep: (automationStep: AutomationStep) => AutomationStep) => void
  onRemoveStep: () => void
}

function StepEditor({ stepIndex, automationStep, onTransformStep, onRemoveStep }: StepEditorProps) {
  const { t } = useTranslation()
  const handleToggleElse = (checked: boolean) => {
    onTransformStep((previousStep) => {
      if (!checked) return { ...previousStep, else: undefined }
      return {
        ...previousStep,
        else: { command: "", target: previousStep.run.target },
      }
    })
  }
  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        <strong>#{stepIndex + 1}</strong>
        <button
          type="button"
          className="mini-btn"
          title={t("removeStep")}
          aria-label={t("removeStep")}
          onClick={onRemoveStep}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <StepConditionEditor automationStep={automationStep} onTransformStep={onTransformStep} />
      <div className={styles.actionRow}>
        <span className={styles.whenLabel}>→</span>
        <input
          value={automationStep.run.command}
          placeholder="git pull --recurse-submodules"
          aria-label={t("commandPh")}
          onChange={(changeEvent) =>
            onTransformStep((previousStep) => ({
              ...previousStep,
              run: { ...previousStep.run, command: changeEvent.target.value },
            }))
          }
        />
      </div>
      <Switch checked={Boolean(automationStep.else)} onChange={handleToggleElse} label={t("useElse")} />
      {automationStep.else && (
        <div className={styles.actionRow}>
          <span className={styles.whenLabel}>↩</span>
          <input
            value={automationStep.else.command}
            placeholder="git stash"
            aria-label={t("useElse")}
            onChange={(changeEvent) =>
              onTransformStep((previousStep) =>
                previousStep.else
                  ? {
                      ...previousStep,
                      else: {
                        ...previousStep.else,
                        command: changeEvent.target.value,
                      },
                    }
                  : previousStep,
              )
            }
          />
        </div>
      )}
    </div>
  )
}

export interface StepListProps {
  draftRecipe: AutomationRecipe
  onAddStep: () => void
  onTransformStep: (stepId: string, transformStep: (automationStep: AutomationStep) => AutomationStep) => void
  onRemoveStep: (stepId: string) => void
}

export function StepList({ draftRecipe, onAddStep, onTransformStep, onRemoveStep }: StepListProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className={styles.stepsHead}>
        <strong>{t("steps")}</strong>
        <button type="button" className="mini-btn" onClick={onAddStep}>
          <Plus size={12} /> {t("addStep")}
        </button>
      </div>
      {draftRecipe.steps.length === 0 ? (
        <p className={styles.noSteps}>{t("noStepsYet")}</p>
      ) : (
        draftRecipe.steps.map((automationStep, stepIndex) => (
          <StepEditor
            key={automationStep.id}
            stepIndex={stepIndex}
            automationStep={automationStep}
            onTransformStep={(transformStep) => onTransformStep(automationStep.id, transformStep)}
            onRemoveStep={() => onRemoveStep(automationStep.id)}
          />
        ))
      )}
    </>
  )
}
