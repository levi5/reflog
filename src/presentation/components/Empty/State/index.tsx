import classnames from "classnames"
import { CircleCheck } from "lucide-react"
import styles from "./style.module.scss"

interface Props {
  message: string
  hint?: string
  small?: boolean
  ok?: boolean
}

export function EmptyState({ message, hint, small = false, ok = false }: Props) {
  return (
    <div className={classnames(styles.empty, small && styles.small, ok && styles.ok)}>
      <div className={styles.message}>
        {ok && <CircleCheck size={14} aria-hidden />} {message}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
