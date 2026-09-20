import { _Either, _Maybe } from "funcio"
import { FolderOpen, Zap } from "lucide-react"
import { useEffect, useState } from "react"

import type { MonitorAutomation } from "../../../domain/entities/automations/automations"
import { gitApi } from "../../../infrastructure/git"
import { t } from "../../../i18n"
import { emptyMonitor, newId } from "../../../main/adapters"
import { Monitor } from "../../components/Monitor"
import { useRepo, useSettingsContext } from "../../context"
import { useAutomations } from "../../hooks"

import styles from "./style.module.scss"

const MONITORS_PER_PAGE = 10

export function Monitors() {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const auto = useAutomations({
    repoRoot: repo.repo,
    submodulePaths: [],
    refreshRepo: () => repo.refresh(repo.repo),
  })

  const initialMonitor = _Maybe.of(auto.monitors[0]).getOrElse(null) as MonitorAutomation | null
  const [selectedId, setSelectedId] = useState<string | null>(initialMonitor?.id ?? null)
  const [draft, setDraft] = useState<MonitorAutomation | null>(initialMonitor)
  const [monitorPage, setMonitorPage] = useState(0)

  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(auto.monitors.length / MONITORS_PER_PAGE) - 1)
    if (monitorPage > lastPage) setMonitorPage(lastPage)
  }, [auto.monitors.length, monitorPage])

  const selectMonitor = (monitor: MonitorAutomation) => {
    setSelectedId(monitor.id)
    setDraft(monitor)
  }

  const createMonitor = () => {
    setSelectedId(null)
    setDraft({ ...emptyMonitor(), repoPath: repo.repo })
  }

  const saveMonitor = (monitor: MonitorAutomation) => {
    auto.saveMonitor(monitor)
    setSelectedId(monitor.id)
    setDraft(monitor)
  }

  const createExampleMonitor = () => {
    const monitor: MonitorAutomation = {
      ...emptyMonitor(),
      name: t(lang, "repositorySummary"),
      description: t(lang, "repositorySummaryDescription"),
      repoPath: repo.repo,
      blocks: [
        {
          id: newId("block"),
          label: t(lang, "monitorChanges"),
          icon: "FileText",
          color: "#f59e0b",
          commands: ["status --short"],
        },
        {
          id: newId("block"),
          label: t(lang, "monitorCurrentBranch"),
          icon: "GitBranch",
          color: "#8b5cf6",
          commands: ["branch --show-current"],
        },
        {
          id: newId("block"),
          label: t(lang, "monitorRecentCommits"),
          icon: "List",
          color: "#10b981",
          commands: ["log --oneline -5"],
        },
      ],
    }
    saveMonitor(monitor)
  }

  const deleteMonitor = (id: string) => {
    const found = auto.monitors.find((m) => m.id !== id)
    const next = _Maybe.of(found).getOrElse(null) as MonitorAutomation | null
    auto.deleteMonitor(id)
    setSelectedId(next?.id ?? null)
    setDraft(next)
  }

  const chooseRepository = async (): Promise<string | null> => {
    const pickedPath = await repo.pickDir()
    const pathOption = _Maybe.of(pickedPath).map((p: string | null) => (p && p.trim().length > 0 ? p : null))
    const path = pathOption.getOrElse(null)
    if (!path) return null

    const checkResult = await _Either.try.async(() => gitApi.checkRepo(path))
    const isRepoValid = checkResult.isRight() && Boolean(checkResult.value)

    if (!isRepoValid) {
      repo.setMsg(t(lang, "invalidRepository"))
      return null
    }

    const rootResult = await _Either.try.async(() => gitApi.repoRoot(path))
    return rootResult.isRight() ? (rootResult.value as string) : null
  }

  if (!repo.repo) {
    return (
      <div className={styles.empty}>
        <FolderOpen size={20} />
        <p>{t(lang, "noRepo")}</p>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.list}>
        <Monitor.List
          monitors={auto.monitors}
          selectedId={selectedId}
          onSelectMonitor={selectMonitor}
          onCreateMonitor={createMonitor}
          onCreateExampleMonitor={createExampleMonitor}
          onRunMonitor={(monitor) => void auto.runMonitor(monitor)}
          onDeleteMonitor={deleteMonitor}
          isRunning={auto.running}
          currentPage={monitorPage}
          onPageChange={setMonitorPage}
        />
      </aside>

      <main className={styles.editor}>
        {draft ? (
          <Monitor.Editor
            key={draft.id}
            monitor={draft}
            onSave={saveMonitor}
            onRun={(monitor) => void auto.runMonitor(monitor)}
            onDelete={deleteMonitor}
            onChooseRepository={chooseRepository}
          />
        ) : (
          <div className={styles.welcome}>
            <Zap size={32} />
            <h3>{t(lang, "monitorsWelcome")}</h3>
            <p>{t(lang, "monitorWelcomeHint")}</p>
          </div>
        )}
      </main>
    </div>
  )
}
