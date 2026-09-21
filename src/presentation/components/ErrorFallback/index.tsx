import { useState } from "react"
import { Check, Copy, Home, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react"
import styles from "./styles.module.scss"

interface ErrorFallbackProps {
  error?: unknown
  reset?: () => void
}

type Lang = "pt" | "en"

const STRINGS: Record<Lang, Record<string, string>> = {
  pt: {
    title: "Ops, algo deu errado",
    subtitle: "O app encontrou um erro inesperado, mas seus dados estão seguros. Tente uma das opções abaixo.",
    retry: "Tentar novamente",
    goHome: "Voltar ao início",
    reload: "Recarregar app",
    copy: "Copiar detalhes",
    copied: "Copiado!",
    details: "Detalhes técnicos",
    hint: "Se o erro persistir, copie os detalhes e abra uma issue no repositório.",
  },
  en: {
    title: "Oops, something went wrong",
    subtitle: "The app hit an unexpected error, but your data is safe. Try one of the options below.",
    retry: "Try again",
    goHome: "Go home",
    reload: "Reload app",
    copy: "Copy details",
    copied: "Copied!",
    details: "Technical details",
    hint: "If the error persists, copy the details and open an issue in the repository.",
  },
}

function readLang(): Lang {
  try {
    const stored = window.localStorage.getItem("forgegit.lang")
    return stored === "en" ? "en" : "pt"
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
  const s = STRINGS[lang]
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
    } catch {
    }
  }

  return (
    <div className={styles.page} role="alert" aria-live="assertive" data-testid="error-fallback">
      <div className={styles.card}>
        <span className={styles.iconWrap} aria-hidden>
          <TriangleAlert size={26} />
        </span>
        <h1 className={styles.title}>{s.title}</h1>
        <p className={styles.subtitle}>{s.subtitle}</p>

        {message && <p className={styles.errorLine}>{message}</p>}

        <div className={styles.actions}>
          {reset && (
            <button type="button" className={styles.primaryBtn} onClick={reset}>
              <RotateCcw size={14} />
              {s.retry}
            </button>
          )}
          <button type="button" className={styles.ghostBtn} onClick={handleGoHome}>
            <Home size={14} />
            {s.goHome}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={handleReload}>
            <RefreshCw size={14} />
            {s.reload}
          </button>
          {message && (
            <button type="button" className={styles.ghostBtn} onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? s.copied : s.copy}
            </button>
          )}
        </div>

        {stack && (
          <details className={styles.details}>
            <summary>{s.details}</summary>
            <pre className={styles.stack}>{stack}</pre>
          </details>
        )}

        <p className={styles.hint}>{s.hint}</p>
      </div>
    </div>
  )
}
