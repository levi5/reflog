import classnames from "classnames"
import { CircleCheck } from "lucide-react"
import styles from "./style.module.scss"

interface Props {
  message: string
  small?: boolean
  ok?: boolean
}

export function EmptyState({ message, small = false, ok = false }: Props) {
  return (
    <div className={classnames(styles.empty, small && styles.small, ok && styles.ok)}>
      {ok && <CircleCheck size={14} />} {message}
    </div>
  )
}
