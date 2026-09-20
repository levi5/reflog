import type { KeyboardEvent } from "react"
import { Play, Plus, Zap } from "lucide-react"

import { List } from "@/presentation/components/List"

import type { MonitorAutomation } from "@/domain/entities"
import { useTranslation } from "@/presentation/context"

import styles from "./style.module.scss"

const MONITORS_PER_PAGE = 10

interface MonitorsListProps {
  monitors: MonitorAutomation[]
  selectedId: string | null
  onSelectMonitor: (monitor: MonitorAutomation) => void
  onCreateMonitor: () => void
  onCreateExampleMonitor: () => void
  onRunMonitor: (monitor: MonitorAutomation) => void
  onDeleteMonitor: (id: string) => void
  isRunning: boolean
  currentPage: number
  onPageChange: (page: number) => void
}

export function MonitorsList({
  monitors,
  selectedId,
  onSelectMonitor,
  onCreateMonitor,
  onCreateExampleMonitor,
  onRunMonitor,
  onDeleteMonitor,
  isRunning,
  currentPage,
  onPageChange,
}: MonitorsListProps) {
  const { t } = useTranslation()

  const header = (
    <div className={styles.listHead}>
      <strong>{t("monitors")}</strong>
      <div className={styles.listActions}>
        <button type="button" className="mini-btn" title={t("localExample")} onClick={onCreateExampleMonitor}>
          <Zap size={12} />
        </button>
        <button type="button" className="mini-btn" onClick={onCreateMonitor}>
          <Plus size={12} /> {t("newMonitor")}
        </button>
      </div>
    </div>
  )

  const emptyState = (
    <div className={styles.emptyList}>
      <p>{t("noMonitors")}</p>
    </div>
  )

  const handleItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, monitor: MonitorAutomation) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelectMonitor(monitor)
    }
  }

  const renderItem = (
    monitor: MonitorAutomation,
    _isSelected: boolean,
    _actions: Array<{ onClick: () => void; disabled?: boolean; ariaLabel?: string }>,
  ) => (
    <>
      <button
        type="button"
        className={styles.itemContent}
        onClick={() => onSelectMonitor(monitor)}
        onKeyDown={(e) => handleItemKeyDown(e, monitor)}
      >
        <span className={styles.monitorColor} style={{ background: monitor.color }} />
        <span>
          <strong>{monitor.name || t("unnamed")}</strong>
          <small>
            {monitor.blocks.length} {t("steps").toLowerCase()}
          </small>
        </span>
      </button>
      <div className={styles.itemActions}>
        <button
          type="button"
          className={styles.actionBtn}
          disabled={isRunning || monitor.blocks.length === 0}
          onClick={(e) => {
            e.stopPropagation()
            onRunMonitor(monitor)
          }}
          aria-label={t("saveAndRun")}
        >
          <Play size={15} />
        </button>
      </div>
    </>
  )

  return (
    <List.Virtual<MonitorAutomation>
      items={monitors}
      selectedId={selectedId}
      currentPage={currentPage}
      pageSize={MONITORS_PER_PAGE}
      onPageChange={onPageChange}
      onSelect={(id) => {
        const monitor = monitors.find((m) => m.id === id)
        if (monitor) onSelectMonitor(monitor)
      }}
      onAction={(id, action) => {
        if (action === "run") {
          const monitor = monitors.find((m) => m.id === id)
          if (monitor) onRunMonitor(monitor)
        } else if (action === "delete") {
          onDeleteMonitor(id)
        }
      }}
      isRunning={isRunning}
      getItemId={(monitor) => monitor.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      listClassName={styles.virtualListWrapper}
    />
  )
}
