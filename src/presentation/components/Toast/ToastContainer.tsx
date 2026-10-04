import { useMessageActions, useMessages, useTranslation } from "../../context"
import { ToastItemView } from "./ToastItem"
import styles from "./styles.module.scss"

export function ToastContainer() {
  const { t } = useTranslation()
  const messages = useMessages()
  const { dismiss } = useMessageActions()

  if (messages.length === 0) return null

  return (
    <section className={styles.toastContainer} aria-label={t("notifications")}>
      {messages.map((item) => (
        <ToastItemView key={item.id} message={item} onDismiss={dismiss} />
      ))}
    </section>
  )
}
