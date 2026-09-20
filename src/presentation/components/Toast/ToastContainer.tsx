import { useMessage } from "../../context"
import { ToastItemView } from "./ToastItem"
import styles from "./styles.module.scss"

export function ToastContainer() {
  const { messages, dismiss } = useMessage()

  if (messages.length === 0) return null

  return (
    <section className={styles.toastContainer} aria-label="Notifications">
      {messages.map((item) => (
        <ToastItemView key={item.id} message={item} onDismiss={dismiss} />
      ))}
    </section>
  )
}
