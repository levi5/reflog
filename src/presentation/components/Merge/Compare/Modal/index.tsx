import classnames from "classnames"
import type { Choice } from "../../../../../domain/entities/conflict/conflicts"
import type { ConflictBlock } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { Modal } from "../../../Modal"
import styles from "./style.module.scss"

interface Props {
  block: ConflictBlock
  onClose: () => void
  onAccept: (block: ConflictBlock, choice: Choice) => void
}

export function CompareModal({ block, onClose, onAccept }: Props) {
  const { t } = useTranslation()
  const choose = (choice: Choice) => () => {
    onAccept(block, choice)
    onClose()
  }
  return (
    <Modal
      wide
      title={`${t("acceptNeither")} — Hunk #${block.id + 1} · L${block.start_line}–${block.end_line}`}
      onClose={onClose}
      actions={
        <button type="button" className="link" onClick={choose("both")}>
          {t("acceptBoth")}
        </button>
      }
    >
      <div className={styles.modalGrid}>
        <div className={classnames(styles.pane, styles.current)}>
          <div className={styles.paneTitle}>
            {t("current")}: {block.current_label || "HEAD"}
          </div>
          <pre>{block.current.join("\n") || t("emptyPane")}</pre>
          <button type="button" className="primary" onClick={choose("current")}>
            {t("acceptCurrent")}
          </button>
        </div>
        <div className={classnames(styles.pane, styles.incoming)}>
          <div className={styles.paneTitle}>
            {t("incoming")}: {block.incoming_label}
          </div>
          <pre>{block.incoming.join("\n") || t("emptyPane")}</pre>
          <button type="button" className="primary" onClick={choose("incoming")}>
            {t("acceptIncoming")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
