import classnames from "classnames"
import { LayoutGrid, SquareTerminal } from "lucide-react"
import type { GitConsoleProps } from "../../../../types/components/console"
import { useTranslation } from "../../../context"
import { Command } from "../../Command"
import { Event } from "../../Event"
import styles from "./style.module.scss"

const TERMINAL_MODE = "term"

export function GitConsole({ session, blocksView }: GitConsoleProps) {
  const { t } = useTranslation()
  const isTerminalMode = session.mode === TERMINAL_MODE || !blocksView

  return (
    <div className={styles.console}>
      {blocksView && (
        <div className={styles.modeRow}>
          <button
            type="button"
            className={classnames("mini-btn", isTerminalMode && "primary-t")}
            aria-pressed={isTerminalMode}
            onClick={() => session.onModeChange(TERMINAL_MODE)}
          >
            <SquareTerminal size={12} /> {t("modeTerminal")}
          </button>
          <button
            type="button"
            className={classnames("mini-btn", !isTerminalMode && "primary-t")}
            aria-pressed={!isTerminalMode}
            onClick={() => session.onModeChange("blocks")}
          >
            <LayoutGrid size={12} /> {t("modeBlocks")}
          </button>
        </div>
      )}
      {isTerminalMode ? (
        <Command.Input
          value={session.command}
          running={session.running}
          intent={session.intent}
          suggestions={session.suggestions}
          onChange={session.onCommandChange}
          onFocus={session.onCommandFocus}
          onBlur={session.onCommandBlur}
          onKeyDown={session.onCommandKeyDown}
          onRequestRun={session.onRequestRun}
        />
      ) : (
        blocksView
      )}
      <Event.Strip changes={session.changes} />
      <Command.Log lines={session.lines} onClear={session.onClear} />
      <Command.ConfirmDialog
        command={session.pendingCommand}
        onCancel={session.onCancelPendingCommand}
        onConfirm={session.onConfirmPendingCommand}
      />
    </div>
  )
}
