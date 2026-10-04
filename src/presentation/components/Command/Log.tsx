import type { CSSProperties } from "react"
import classnames from "classnames"
import { Trash2 } from "lucide-react"

import { ResizeGrip } from "../Resizable/Grip"

import { useResizable } from "../../hooks"
import type { CommandLogProps } from "../../../types/components/command"
import { useTranslation } from "../../context"

import styles from "./style.module.scss"

const LOG_HEIGHT_STORAGE_KEY = "viz.console"
const INITIAL_LOG_HEIGHT = 180
const MIN_LOG_HEIGHT = 80
const MAX_LOG_HEIGHT = 420
const LINE_ANIMATION_STEP_MS = 35
const LINE_ANIMATION_MAX_DELAY_MS = 250

export function CommandLog({ lines, onClear }: CommandLogProps) {
  const { t } = useTranslation()
  const logHeight = useResizable({
    axis: "y",
    initial: INITIAL_LOG_HEIGHT,
    min: MIN_LOG_HEIGHT,
    max: MAX_LOG_HEIGHT,
    storageKey: LOG_HEIGHT_STORAGE_KEY,
    label: t("resizeConsole"),
  })

  if (lines.length === 0) return null

  return (
    <div className={styles.outWrap}>
      <div className={styles.outHeader}>
        <span className={styles.outTitle}>{t("log")}</span>
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClear}
          title={t("clearConsole")}
          aria-label={t("clearConsole")}
        >
          <Trash2 size={11} />
          <span>{t("clearConsole")}</span>
        </button>
      </div>
      <pre
        className={styles.consoleOut}
        role="log"
        aria-live="polite"
        aria-label={t("gitConsole")}
        style={{ height: logHeight.size, maxHeight: "none" } as CSSProperties}
      >
        {lines.map((line, index) => (
          <div
            key={`${line.at}-${line.cmd}`}
            className={classnames(styles.cmdLine, line.err && styles.cmdErr)}
            style={{
              animationDelay: `${Math.min(index * LINE_ANIMATION_STEP_MS, LINE_ANIMATION_MAX_DELAY_MS)}ms`,
            }}
          >
            <span className={styles.cmdEcho}>$ git {line.cmd}</span>
            {"\n"}
            {line.out}
            {"\n"}
          </div>
        ))}
      </pre>
      <ResizeGrip axis="y" grip={logHeight.grip} />
    </div>
  )
}
