import type { ReactNode, HTMLAttributes } from "react"
import classnames from "classnames"

import styles from "./styles.module.scss"

interface ActivityIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "loading" | "success" | "error" | "idle"
  size?: "sm" | "md" | "lg"
  label?: string
}

export function ActivityIndicator({
  variant = "idle",
  size = "md",
  label,
  className,
  children,
  ...rest
}: ActivityIndicatorProps) {
  if (variant === "loading" && !children) {
    return (
      <span
        className={classnames(styles.indicator, styles.loading, styles[size], className)}
        role="status"
        aria-live="polite"
        {...rest}
      >
        <span className={styles.spinner} />
        {label && <span className={styles.label}>{label}</span>}
      </span>
    )
  }

  const icon =
    children ??
    (variant === "success" ? (
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
    ) : variant === "error" ? (
      <span className={styles.error} aria-hidden="true">
        ✕
      </span>
    ) : (
      <span className={styles.dot} aria-hidden="true" />
    ))

  return (
    <span className={classnames(styles.indicator, styles[variant], styles[size], className)} {...rest}>
      {icon}
      {label && <span className={styles.label}>{label}</span>}
    </span>
  )
}

interface ActivityFeedProps extends HTMLAttributes<HTMLDivElement> {
  items: Array<{
    id: string
    timestamp: Date | number
    message: ReactNode
    variant?: "info" | "success" | "error" | "warning"
    meta?: ReactNode
  }>
  emptyMessage?: ReactNode
}

export function ActivityFeed({ items, emptyMessage = "No activity", className, ...rest }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className={classnames(styles.feed, styles.empty, className)} {...rest}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={classnames(styles.feed, className)} {...rest}>
      {items.map((item) => (
        <div key={item.id} className={classnames(styles.feedItem, styles[item.variant || "info"])}>
          <time className={styles.timestamp} dateTime={new Date(item.timestamp).toISOString()}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </time>
          <div className={styles.message}>{item.message}</div>
          {item.meta && <div className={styles.meta}>{item.meta}</div>}
        </div>
      ))}
    </div>
  )
}

interface ActivityStep {
  id: string
  label: string
  status: "pending" | "running" | "completed" | "error"
  message?: string
}

interface ActivityStepsProps extends HTMLAttributes<HTMLDivElement> {
  steps: ActivityStep[]
  currentStep?: string
}

export function ActivitySteps({ steps, currentStep, className, ...rest }: ActivityStepsProps) {
  return (
    <div className={classnames(styles.steps, className)} {...rest}>
      {steps.map((step, index) => (
        <div key={step.id} className={classnames(styles.step, styles[step.status])}>
          <span className={classnames(styles.stepNumber, step.status === "running" && styles.running)}>
            {step.status === "running" ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : step.status === "completed" ? (
              "✓"
            ) : step.status === "error" ? (
              "✕"
            ) : (
              index + 1
            )}
          </span>
          <div className={styles.stepContent}>
            <strong>{step.label}</strong>
            {step.message && <span className={styles.stepMessage}>{step.message}</span>}
          </div>
          {step.status === "running" && <span className={styles.currentBadge}>{t("current")}</span>}
        </div>
      ))}
    </div>
  )
}

function t(key: string): string {
  const labels: Record<string, string> = {
    current: "current",
  }
  return labels[key] || key
}

export const Activity = {
  Indicator: ActivityIndicator,
  Feed: ActivityFeed,
  Steps: ActivitySteps,
}
