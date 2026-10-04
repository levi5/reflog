import { LogoMark } from "./Logo"
import styles from "./styles.module.scss"

export function AppBrand() {
  return (
    <span className={styles.brand}>
      <LogoMark size={16} className={styles.mark} />
      Reflog
    </span>
  )
}
