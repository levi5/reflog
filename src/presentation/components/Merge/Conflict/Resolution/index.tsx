import classnames from "classnames"
import type { Choice } from "../../../../../domain/entities/conflict/conflicts"
import type { StringKey } from "../../../../../i18n"
import { useTranslation } from "../../../../context"
import styles from "./style.module.scss"

interface Props {
  onAccept: (choice: Choice) => void
}

const ROWS: { choice: Choice; label: StringKey; key: string }[] = [
  { choice: "current", label: "acceptOurs", key: "Alt+1" },
  { choice: "incoming", label: "acceptTheirs", key: "Alt+2" },
  { choice: "both", label: "acceptBothUnion", key: "Alt+B" },
]

export function ResolutionHelper({ onAccept }: Props) {
  const { t } = useTranslation()
  return (
    <div className={classnames(styles.helper)}>
      <div className={styles.helperHead}>
        <strong>{t("resolutionHelper")}</strong>
        <span>{t("shortcuts")}</span>
      </div>
      {ROWS.map((r) => (
        <button type="button" key={r.choice} onClick={() => onAccept(r.choice)}>
          <span>{t(r.label)}</span>
          <kbd>{r.key}</kbd>
        </button>
      ))}
    </div>
  )
}
