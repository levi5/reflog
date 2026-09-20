import type { GripProps } from "../../../hooks"
import styles from "./style.module.scss"

interface Props {
  axis: "x" | "y"
  grip: GripProps
  edge?: "start" | "end"
}

export function ResizeGrip({ axis, grip, edge = "end" }: Props) {
  const className = axis === "x" ? (edge === "start" ? styles.gripXStart : styles.gripX) : styles.gripY
  return <div className={className} {...grip} />
}
