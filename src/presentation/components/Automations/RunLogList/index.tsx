import { gitCommandParserUseCase } from "../../../../data"
import { useTranslation } from "../../../context"
import type { AutomationLogLine } from "../../../../domain/entities/automations/automations"
import styles from "./style.module.scss"

interface RunLogListProps {
  logLines: AutomationLogLine[]
  draftRepoPath: string | undefined
  currentRepoPath: string
}

export function RunLogList({ logLines, draftRepoPath, currentRepoPath }: RunLogListProps) {
  const { t } = useTranslation()
  if (logLines.length === 0) return null
  const getLogTargetLabel = (logTarget: string, draftRepoPath: string | undefined, currentRepoPath: string): string => {
    const effectiveRepoPath = draftRepoPath || currentRepoPath
    if (logTarget === effectiveRepoPath) return "repo"
    return logTarget
  }
  return (
    <>
      <strong>{t("runLog")}</strong>
      <div className={styles.log} role="log" aria-live="polite" aria-label={t("runLog")}>
        {logLines.map((logLine) => (
          <div key={logLine.at} className={logLine.err ? styles.logErr : undefined}>
            <span className={styles.logTarget}>
              [{getLogTargetLabel(logLine.target, draftRepoPath, currentRepoPath)}]
            </span>{" "}
            <span className={styles.logCmd}>$ git {gitCommandParserUseCase.stripGitPrefix(logLine.cmd)}</span>
            {"\n"}
            {logLine.out}
          </div>
        ))}
      </div>
    </>
  )
}
