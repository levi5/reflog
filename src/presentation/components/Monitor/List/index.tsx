import { Play, Plus, Trash2, Zap } from "lucide-react"

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

  const renderItem = (monitor: MonitorAutomation, _isSelected: boolean) => (
    <>
      <button type="button" className={styles.itemContent} onClick={() => onSelectMonitor(monitor)}>
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
          onClick={() => onRunMonitor(monitor)}
          aria-label={t("saveAndRun")}
        >
          <Play size={15} />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onDeleteMonitor(monitor.id)}
          aria-label={t("delete")}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </>
  )

  return (
    <List.Paged<MonitorAutomation>
      items={monitors}
      selectedId={selectedId}
      currentPage={currentPage}
      pageSize={MONITORS_PER_PAGE}
      onPageChange={onPageChange}
      getItemId={(monitor) => monitor.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      listClassName={styles.virtualListWrapper}
    />
  )
}
