import { ArrowRight, TriangleAlert } from "lucide-react"
import type { Intent } from "../../../domain/entities/git/git-console"
import type { StringKey } from "../../../i18n"
import type { CommandIntentHintProps } from "../../../types/components/command"
import { useTranslation } from "../../context"
import styles from "./style.module.scss"

const BLOCKED_INTENT_KIND = "blocked"

type Translate = (key: StringKey) => string

type IntentLabelBuilder = (translate: Translate, argument: string) => string

const INTENT_LABEL_BUILDERS: Record<string, IntentLabelBuilder> = {
  branch: (translate, argument) => `${translate("intentNew")} branch ${argument}`.trim(),
  "branch-del": (translate, argument) => `${translate("intentDel")} ${argument}`.trim(),
  checkout: (translate, argument) => `${translate("intentMove")} ${argument}`.trim(),
  merge: (translate, argument) => `${translate("intentMergeInto")} ← ${argument}`.trim(),
  commit: (translate, argument) => (argument ? `${translate("intentCommit")}: ${argument}` : translate("intentCommit")),
  tag: (translate, argument) => `${translate("intentTag")} ${argument}`.trim(),
  read: (translate, argument) => `${argument}: ${translate("intentRead")}`,
  do: (translate, argument) => `${translate("intentDo")}: git ${argument}`,
  local: (_translate, argument) => argument,
}

function describeIntentLabel(translate: Translate, intent: Intent): string {
  const buildLabel = INTENT_LABEL_BUILDERS[intent.kind]
  if (!buildLabel) return `${intent.arg}: ${translate("intentBlocked")}`
  return buildLabel(translate, intent.arg)
}

export function CommandIntentHint({ intent }: CommandIntentHintProps) {
  const { t } = useTranslation()
  if (!intent) return null

  return (
    <div className={styles.intent}>
      {intent.kind === BLOCKED_INTENT_KIND ? <TriangleAlert size={12} /> : <ArrowRight size={12} />}
      <span>{describeIntentLabel(t, intent)}</span>
    </div>
  )
}
