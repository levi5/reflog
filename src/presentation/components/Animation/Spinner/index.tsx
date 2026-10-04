import { useTranslation } from "../../../context"
import styles from "./styles.module.scss"

export function Spinner() {
  const { t } = useTranslation()
  return <div className={styles.spinner} role="status" aria-label={t("loadingGeneric")} />
}
