import { GitBranch } from "lucide-react"
import styles from "./styles.module.scss"

export function AppBrand() {
  return (
    <span className={styles.brand}>
      <GitBranch size={14} /> Reflog
    </span>
  )
}
