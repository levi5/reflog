import { GripVertical, RotateCcw } from "lucide-react"
import type { PointerEvent } from "react"
import { useTranslation } from "../../context"
import styles from "./workspace.module.scss"

export function FloatingWindowTools({
  onMove,
  onReset,
}: {
  onMove: (event: PointerEvent<HTMLElement>) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.windowTools}>
      <button
        type="button"
        className="ghost"
        onPointerDown={onMove}
        aria-label={t("floatingMoveWindow")}
        title={t("floatingMoveWindow")}
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        className="ghost"
        onClick={onReset}
        aria-label={t("floatingResetSize")}
        title={t("floatingResetSize")}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  )
}
