import { QUICK } from "../../../shared/constants/gitConsole"
import type { CommandInputProps } from "../../../types/components/command"
import { useTranslation } from "../../context"
import { CommandIntentHint } from "./IntentHint"
import { CommandSuggestions } from "./Suggestions"

import styles from "./style.module.scss"

export function CommandInput({
  value,
  running,
  intent,
  suggestions,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onRequestRun,
}: CommandInputProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className={styles.cmdWrap}>
        <div className={styles.consoleRow}>
          <span className={styles.prompt}>$</span>
          <input
            className={styles.cmdInput}
            value={value}
            placeholder={t("commandPh")}
            disabled={running}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        </div>
        {suggestions.isOpen && <CommandSuggestions query={value} suggestions={suggestions} />}
      </div>
      <div className={styles.chips}>
        {QUICK.map((quickCommand) => (
          <button
            key={quickCommand}
            type="button"
            className="mini-btn"
            disabled={running}
            onClick={() => onRequestRun(quickCommand)}
          >
            {quickCommand}
          </button>
        ))}
        <span className={styles.consoleHint}>{t("consoleHint")}</span>
      </div>
      <CommandIntentHint intent={intent} />
    </>
  )
}
