import { useRef } from "react"
import { useTranslation } from "../../../context"
import { Modal } from "../../Modal"
import styles from "./style.module.scss"

interface Props {
  filePath: string
  content: string
  draft: string
  saving: boolean
  onDraftChange: (nextDraft: string) => void
  onSave: () => void
  onClose: () => void
}

export function FileEditor({ filePath, content, draft, saving, onDraftChange, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const dirty = draft !== content

  return (
    <Modal
      open
      size="lg"
      title={filePath}
      onClose={onClose}
      initialFocus={areaRef}
      actions={
        <>
          <button type="button" onClick={() => void onClose()}>
            {t("cancel")}
          </button>
          <button type="button" className="primary" onClick={onSave} disabled={!dirty || saving}>
            {saving ? t("savingFile") : t("save")}
          </button>
        </>
      }
    >
      <textarea
        ref={areaRef}
        className={styles.editor}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        spellCheck={false}
        wrap="off"
        aria-label={filePath}
      />
    </Modal>
  )
}
