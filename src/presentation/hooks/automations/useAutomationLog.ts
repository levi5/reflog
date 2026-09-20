import { useCallback, useState } from "react"
import type { AutomationLogLine } from "../../../domain/entities/automations/automations"
import { AUTOMATION_LOG_TAIL } from "../../../shared/constants/limits"

export function useAutomationLog() {
  const [log, setLog] = useState<AutomationLogLine[]>([])
  const [running, setRunning] = useState(false)

  const clearLog = useCallback(() => setLog([]), [])
  const pushToLog = useCallback((line: Omit<AutomationLogLine, "at">) => {
    setLog((previous) => [...previous.slice(-AUTOMATION_LOG_TAIL), { ...line, at: Date.now() }])
  }, [])
  const replaceLog = useCallback((lines: Omit<AutomationLogLine, "at">[]) => {
    setLog(lines.map((line) => ({ ...line, at: Date.now() })))
  }, [])

  return { log, setLog, running, setRunning, clearLog, pushToLog, replaceLog }
}
