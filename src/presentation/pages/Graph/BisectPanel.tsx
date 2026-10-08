import { useState } from "react"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"
import styles from "./style.module.scss"

interface BisectPanelProps {
  lang: Lang
  isBisecting: boolean
  busy: boolean
  log: string
  start: (bad: string, good: string) => Promise<void>
  mark: (kind: "good" | "bad") => Promise<void>
  skip: () => Promise<void>
  reset: () => Promise<void>
  loadLog: () => Promise<void>
}

export function BisectPanel({ lang, isBisecting, busy, log, start, mark, skip, reset, loadLog }: BisectPanelProps) {
  const [isStarting, setIsStarting] = useState(false)
  const [bad, setBad] = useState("HEAD")
  const [good, setGood] = useState("")

  return (
    <section className={styles.bisectPanel} aria-label={t(lang, "bisect")}>
      <div className={styles.bisectHead}>
        <strong>{isBisecting ? t(lang, "bisectInProgress") : t(lang, "bisect")}</strong>
        {!isBisecting && (
          <button type="button" className="mini-btn" onClick={() => setIsStarting((open) => !open)}>
            {isStarting ? t(lang, "cancel") : t(lang, "bisectStart")}
          </button>
        )}
      </div>
      {!isBisecting && isStarting && (
        <div className={styles.bisectControls}>
          <input
            value={bad}
            onChange={(event) => setBad(event.target.value)}
            placeholder={t(lang, "bisectBadPh")}
            aria-label={t(lang, "bisectBadPh")}
          />
          <input
            value={good}
            onChange={(event) => setGood(event.target.value)}
            placeholder={t(lang, "bisectGoodPh")}
            aria-label={t(lang, "bisectGoodPh")}
          />
          <button
            type="button"
            className="mini-btn primary"
            disabled={busy || !bad.trim() || !good.trim()}
            onClick={() => {
              void start(bad, good)
              setIsStarting(false)
            }}
          >
            {t(lang, "bisectStart")}
          </button>
        </div>
      )}
      {isBisecting && (
        <>
          <div className={styles.bisectControls}>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => void mark("good")}>
              {t(lang, "bisectGood")}
            </button>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => void mark("bad")}>
              {t(lang, "bisectBad")}
            </button>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => void skip()}>
              {t(lang, "bisectSkip")}
            </button>
            <button type="button" className="mini-btn danger" disabled={busy} onClick={() => void reset()}>
              {t(lang, "bisectReset")}
            </button>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => void loadLog()}>
              {t(lang, "bisectLog")}
            </button>
          </div>
          {log && <pre className={styles.bisectLog}>{log}</pre>}
        </>
      )}
    </section>
  )
}
