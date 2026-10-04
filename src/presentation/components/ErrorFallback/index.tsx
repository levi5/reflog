import { useState } from "react"
import { Check, Copy, Home, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react"
import { detectLocale, formatMessage, type StringKey } from "../../../i18n"
import type { Lang } from "../../../types"
import styles from "./styles.module.scss"

interface ErrorFallbackProps {
  error?: unknown
  reset?: () => void
}

function readLang(): Lang {
  try {
    return detectLocale()
  } catch {
    return "pt"
  }
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  if (typeof error === "string") return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function toStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) return error.stack
  return undefined
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const [copied, setCopied] = useState(false)
  const lang = readLang()
  const tr = (key: StringKey) => formatMessage(lang, key)
  const message = error ? toMessage(error) : ""
  const stack = error ? toStack(error) : undefined

  const handleGoHome = () => {
    try {
      window.location.hash = "#/"
    } catch {
      window.location.reload()
    }
    reset?.()
  }

  const handleReload = () => window.location.reload()

  const handleCopy = async () => {
    const text = [message, stack].filter(Boolean).join("\n\n")
    try {
      await navigator.clipboard.writeText(text || "unknown error")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className={styles.page} role="alert" aria-live="assertive" data-testid="error-fallback">
      <div className={styles.card}>
        <span className={styles.iconWrap} aria-hidden>
          <TriangleAlert size={26} />
        </span>
        <h1 className={styles.title}>{tr("errorTitle")}</h1>
        <p className={styles.subtitle}>{tr("errorSubtitle")}</p>

        {message && <p className={styles.errorLine}>{message}</p>}

        <div className={styles.actions}>
          {reset && (
            <button type="button" className={styles.primaryBtn} onClick={reset}>
              <RotateCcw size={14} />
              {tr("errorRetry")}
            </button>
          )}
          <button type="button" className={styles.ghostBtn} onClick={handleGoHome}>
            <Home size={14} />
            {tr("errorGoHome")}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={handleReload}>
            <RefreshCw size={14} />
            {tr("errorReload")}
          </button>
          {message && (
            <button type="button" className={styles.ghostBtn} onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? tr("errorCopied") : tr("errorCopy")}
            </button>
          )}
        </div>

        {stack && (
          <details className={styles.details}>
            <summary>{tr("errorDetails")}</summary>
            <pre className={styles.stack}>{stack}</pre>
          </details>
        )}

        <p className={styles.hint}>{tr("errorHint")}</p>
      </div>
    </div>
  )
}
