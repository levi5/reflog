import classnames from "classnames"
import styles from "./style.module.scss"

interface SkeletonProps {
  count?: number
  className?: string
  label?: string
}

function bars(count: number) {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i)
}

export function SkeletonLines({ count = 3, className, label }: SkeletonProps) {
  return (
    <div className={classnames(styles.lines, className)} role="status" aria-busy aria-label={label}>
      {bars(count).map((i) => (
        <i key={i} className={styles.bar} aria-hidden />
      ))}
    </div>
  )
}

export function SkeletonCommits({ count = 10, className, label }: SkeletonProps) {
  return (
    <div className={className} role="status" aria-busy aria-label={label}>
      {bars(count).map((i) => (
        <div key={i} className={styles.row} aria-hidden>
          <span className={styles.node} />
          <span className={styles.rowLines}>
            <i className={styles.bar} />
            <i className={styles.bar} />
          </span>
        </div>
      ))}
    </div>
  )
}

export const Skeleton = {
  Lines: SkeletonLines,
  Commits: SkeletonCommits,
}
