import { FileCode, Sparkles } from "lucide-react"

import { Modal } from "../../Modal"
import { useTranslation } from "../../../context"
import { BUILTIN_DOCS, READY_TEMPLATE_IDS, type ReadyTemplateId } from "@/shared/constants/commit/commitMarkdown"

import styles from "./style.module.scss"

export const BLANK_START = "blank"

export type TemplateStartMode = typeof BLANK_START | ReadyTemplateId

const READY_IDS: readonly string[] = READY_TEMPLATE_IDS
const READY_DOCS = BUILTIN_DOCS.filter((doc) => READY_IDS.includes(doc.id))

interface TemplateCreateDialogProps {
  open: boolean
  onCancel: () => void
  onSelect: (mode: TemplateStartMode) => void
}

export function TemplateCreateDialog({ open, onCancel, onSelect }: TemplateCreateDialogProps) {
  const { t, format } = useTranslation()

  return (
    <Modal
      open={open}
      size="sm"
      title={t("templateNew")}
      onClose={onCancel}
      actions={
        <button type="button" onClick={onCancel}>
          {t("cancel")}
        </button>
      }
    >
      <p className={styles.hint}>{t("templateNewHint")}</p>

      <div className={styles.options}>
        <button type="button" className={styles.option} onClick={() => onSelect(BLANK_START)}>
          <span className={styles.optionIcon}>
            <FileCode size={16} />
          </span>
          <span className={styles.optionBody}>
            <strong>{t("templateStartBlank")}</strong>
            <small>{t("templateStartBlankHint")}</small>
          </span>
        </button>

        {READY_DOCS.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className={styles.option}
            onClick={() => onSelect(doc.id as ReadyTemplateId)}
          >
            <span className={styles.optionIcon}>
              <Sparkles size={16} />
            </span>
            <span className={styles.optionBody}>
              <strong>{format("templateStartReady", { name: doc.name })}</strong>
              <code className={styles.optionPattern}>{doc.pattern.trim()}</code>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
